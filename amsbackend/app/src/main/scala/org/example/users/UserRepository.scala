package org.example.users

import org.example.departments.DepartmentsTable
import slick.jdbc.PostgresProfile.api._

import scala.concurrent.{ExecutionContext, Future}

final class UserRepository(
    database: slick.jdbc.JdbcBackend.Database
)(implicit executionContext: ExecutionContext) {

  private val userDetailsQuery = for {
    ((u, r), d) <- UsersTable.query
      .join(RolesTable.query).on(_.roleId === _.id)
      .joinLeft(DepartmentsTable.query).on(_._1.departmentId === _.id.?)
  } yield (u, r.name, d.map(_.name))

  def findAll(
      page: Int,
      pageSize: Int,
      search: Option[String] = None,
      employeeId: Option[String] = None,
      email: Option[String] = None,
      roleName: Option[String] = None,
      departmentId: Option[Long] = None,
      status: Option[String] = None
  ): Future[UserPage] = {
    val safePage = math.max(1, page)
    val safePageSize = math.max(1, math.min(pageSize, 100))
    val offset = (safePage - 1).toLong * safePageSize

    var q = for {
      (u, r, d) <- userDetailsQuery
    } yield (u, r, d)

    search.map(_.trim).filter(_.nonEmpty).foreach { term =>
      val pattern = s"%${term.toLowerCase}%"
      q = q.filter { case (u, _, _) =>
        u.employeeId.toLowerCase.like(pattern) ||
        u.name.toLowerCase.like(pattern) ||
        u.email.toLowerCase.like(pattern)
      }
    }

    employeeId.map(_.trim).filter(_.nonEmpty).foreach { empId =>
      q = q.filter { case (u, _, _) => u.employeeId.toLowerCase === empId.toLowerCase }
    }

    email.map(_.trim).filter(_.nonEmpty).foreach { em =>
      q = q.filter { case (u, _, _) => u.email.toLowerCase === em.toLowerCase }
    }

    roleName.map(_.trim.toUpperCase).filter(_.nonEmpty).foreach { rName =>
      q = q.filter { case (_, r, _) => r === rName }
    }

    departmentId.foreach { dId =>
      q = q.filter { case (u, _, _) => u.departmentId === Option(dId) }
    }

    status.map(_.trim.toUpperCase).filter(_.nonEmpty).foreach { st =>
      q = q.filter { case (u, _, _) => u.status === st }
    }

    val itemsAction = q
      .sortBy { case (u, _, _) => u.id.asc }
      .drop(offset)
      .take(safePageSize)
      .result

    val countAction = q.length.result

    database.run(itemsAction.zip(countAction)).map { case (rows, total) =>
      val userResponses = rows.map { case (u, r, d) =>
        UserResponse(
          id = u.id,
          employeeId = u.employeeId,
          name = u.name,
          email = u.email,
          role = r,
          roleId = u.roleId,
          departmentId = u.departmentId,
          departmentName = d,
          status = u.status
        )
      }
      UserPage(userResponses, safePage, safePageSize, total)
    }
  }

  def findById(id: Long): Future[Option[(User, String, Option[String])]] = {
    val q = for {
      ((u, r), d) <- UsersTable.query.filter(_.id === id)
        .join(RolesTable.query).on(_.roleId === _.id)
        .joinLeft(DepartmentsTable.query).on(_._1.departmentId === _.id.?)
    } yield (u, r.name, d.map(_.name))

    database.run(q.result.headOption)
  }

  def findUserOnlyById(id: Long): Future[Option[User]] =
    database.run(UsersTable.query.filter(_.id === id).result.headOption)

  def findByEmployeeId(empId: String): Future[Option[User]] =
    database.run(
      UsersTable.query
        .filter(_.employeeId.toLowerCase === empId.trim.toLowerCase)
        .result
        .headOption
    )

  def findByEmail(email: String): Future[Option[User]] =
    database.run(
      UsersTable.query
        .filter(_.email.toLowerCase === email.trim.toLowerCase)
        .result
        .headOption
    )

  def create(user: User): Future[User] = {
    val insertQuery = (UsersTable.query returning UsersTable.query.map(_.id)) += user
    database.run(insertQuery).map(id => user.copy(id = id))
  }

  def updateDetails(
      id: Long,
      name: Option[String],
      email: Option[String],
      departmentId: Option[Option[Long]],
      passwordHash: Option[String]
  ): Future[Option[User]] = {
    findUserOnlyById(id).flatMap {
      case None => Future.successful(None)
      case Some(existing) =>
        val updated = existing.copy(
          name = name.getOrElse(existing.name),
          email = email.getOrElse(existing.email),
          departmentId = departmentId.getOrElse(existing.departmentId),
          passwordHash = passwordHash.getOrElse(existing.passwordHash)
        )
        database.run(UsersTable.query.filter(_.id === id).update(updated)).map {
          case 0 => None
          case _ => Some(updated)
        }
    }
  }

  def updateStatus(id: Long, status: String): Future[Int] =
    database.run(UsersTable.query.filter(_.id === id).map(_.status).update(status))

  def updateRole(id: Long, roleId: Long): Future[Int] =
    database.run(UsersTable.query.filter(_.id === id).map(_.roleId).update(roleId))

  def delete(id: Long): Future[Int] =
    database.run(UsersTable.query.filter(_.id === id).delete)

  def countActiveSuperAdmins(): Future[Int] = {
    val q = for {
      u <- UsersTable.query if u.status === "ACTIVE"
      r <- RolesTable.query if u.roleId === r.id && r.name === "SUPER_ADMIN"
    } yield u.id

    database.run(q.length.result)
  }

  def listRoles(): Future[Seq[Role]] =
    database.run(RolesTable.query.sortBy(_.id.asc).result)

  def getRoleById(roleId: Long): Future[Option[Role]] =
    database.run(RolesTable.query.filter(_.id === roleId).result.headOption)

  def getRoleByName(roleName: String): Future[Option[Role]] =
    database.run(
      RolesTable.query
        .filter(_.name.toUpperCase === roleName.trim.toUpperCase)
        .result
        .headOption
    )

  def isDepartmentValid(deptId: Long): Future[Boolean] =
    database.run(DepartmentsTable.query.filter(_.id === deptId).exists.result)

  def isReferencedInAssetsOrItems(userId: Long): Future[Boolean] = {
    val ownerAction = sql"SELECT COUNT(*) FROM assets WHERE asset_owner_id = $userId".as[Int].head
    val custodianAction = sql"SELECT COUNT(*) FROM assets WHERE custodian_id = $userId".as[Int].head

    database.run(
      for {
        o <- ownerAction
        c <- custodianAction
      } yield (o + c) > 0
    )
  }

  def listCustodians(): Future[Seq[UserResponse]] = {
    val q = userDetailsQuery
      .filter { case (u, r, _) => r === "CUSTODIAN" && u.status === "ACTIVE" }
      .sortBy { case (u, _, _) => u.name.asc }
      .result

    database.run(q).map { rows =>
      rows.map { case (u, rName, dName) =>
        UserResponse(
          id = u.id,
          employeeId = u.employeeId,
          name = u.name,
          email = u.email,
          role = rName,
          roleId = u.roleId,
          departmentId = u.departmentId,
          departmentName = dName,
          status = u.status
        )
      }
    }
  }
}
