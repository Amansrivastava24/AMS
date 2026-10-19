package org.example.departments

import slick.jdbc.PostgresProfile.api._
import scala.concurrent.{ExecutionContext, Future}

final class DepartmentRepository(
    database: slick.jdbc.JdbcBackend.Database
)(implicit executionContext: ExecutionContext) {

  def findAll(): Future[Seq[Department]] =
    database.run(DepartmentsTable.query.sortBy(_.name.asc).result)

  def findById(id: Long): Future[Option[Department]] =
    database.run(DepartmentsTable.query.filter(_.id === id).result.headOption)

  def findByName(name: String): Future[Option[Department]] =
    database.run(
      DepartmentsTable.query
        .filter(d => d.name.toLowerCase === name.trim.toLowerCase)
        .result
        .headOption
    )

  def create(name: String): Future[Department] = {
    val cleanName = name.trim
    val insertQuery = (DepartmentsTable.query returning DepartmentsTable.query.map(_.id)) += Department(0L, cleanName)
    database.run(insertQuery).map(id => Department(id, cleanName))
  }

  def update(id: Long, name: String): Future[Option[Department]] = {
    val cleanName = name.trim
    val q = DepartmentsTable.query.filter(_.id === id).map(_.name)
    database.run(q.update(cleanName)).flatMap {
      case 0 => Future.successful(None)
      case _ => findById(id)
    }
  }

  def isReferenced(id: Long): Future[Boolean] = {
    // Check if referenced by users table
    val checkQuery = sql"SELECT COUNT(*) FROM users WHERE department_id = $id".as[Int].head
    database.run(checkQuery).map(_ > 0)
  }

  def delete(id: Long): Future[Boolean] =
    database.run(DepartmentsTable.query.filter(_.id === id).delete).map(_ > 0)
}
