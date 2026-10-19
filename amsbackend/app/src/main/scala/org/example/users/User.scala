package org.example.users

import slick.jdbc.PostgresProfile.api._

case class User(
    id: Long,
    employeeId: String,
    name: String,
    email: String,
    passwordHash: String,
    roleId: Long,
    departmentId: Option[Long],
    status: String
)

case class Role(
    id: Long,
    name: String
)

case class UserResponse(
    id: Long,
    employeeId: String,
    name: String,
    email: String,
    role: String,
    roleId: Long,
    departmentId: Option[Long],
    departmentName: Option[String],
    status: String
)

case class CreateUserRequest(
    employeeId: String,
    name: String,
    email: String,
    password: String,
    roleId: Any,
    departmentId: Option[Any] = None,
    status: Option[String] = Some("ACTIVE")
) {
  def cleanRoleId: Long = roleId match {
    case n: Number => n.longValue()
    case s: String if s.trim.nonEmpty => scala.util.Try(s.trim.toLong).getOrElse(0L)
    case _ => 0L
  }

  def cleanDepartmentId: Option[Long] = departmentId match {
    case Some(n: Number) => Some(n.longValue())
    case Some(s: String) if s.trim.nonEmpty => scala.util.Try(s.trim.toLong).toOption
    case _ => None
  }
}

case class UpdateUserRequest(
    name: Option[String] = None,
    email: Option[String] = None,
    departmentId: Option[Any] = None,
    password: Option[String] = None
) {
  def cleanDepartmentId: Option[Option[Long]] = departmentId match {
    case None => None
    case Some(null) => Some(None)
    case Some(n: Number) => Some(Some(n.longValue()))
    case Some(s: String) if s.trim.isEmpty => Some(None)
    case Some(s: String) => Some(scala.util.Try(s.trim.toLong).toOption)
    case _ => Some(None)
  }
}

case class UpdateStatusRequest(
    status: String
)

case class UpdateRoleRequest(
    roleId: Any
) {
  def cleanRoleId: Long = roleId match {
    case n: Number => n.longValue()
    case s: String if s.trim.nonEmpty => scala.util.Try(s.trim.toLong).getOrElse(0L)
    case _ => 0L
  }
}

case class UserPage(
    items: Seq[UserResponse],
    page: Int,
    pageSize: Int,
    totalItems: Int
)

class RolesTable(tag: Tag) extends Table[Role](tag, "roles") {
  def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
  def name = column[String]("name")

  def * = (id, name) <> (Role.tupled, Role.unapply)
}

object RolesTable {
  val query = TableQuery[RolesTable]
}

class UsersTable(tag: Tag) extends Table[User](tag, "users") {
  def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
  def employeeId = column[String]("employee_id")
  def name = column[String]("name")
  def email = column[String]("email")
  def passwordHash = column[String]("password_hash")
  def roleId = column[Long]("role_id")
  def departmentId = column[Option[Long]]("department_id")
  def status = column[String]("status")

  def * = (id, employeeId, name, email, passwordHash, roleId, departmentId, status) <> (User.tupled, User.unapply)
}

object UsersTable {
  val query = TableQuery[UsersTable]
}
