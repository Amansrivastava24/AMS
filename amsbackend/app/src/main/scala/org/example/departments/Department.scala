package org.example.departments

import slick.jdbc.PostgresProfile.api._

case class Department(
    id: Long,
    name: String
)

case class DepartmentRequest(
    name: String
)

class DepartmentsTable(tag: Tag) extends Table[Department](tag, "departments") {
  def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
  def name = column[String]("name")

  def * = (id, name) <> (Department.tupled, Department.unapply)
}

object DepartmentsTable {
  val query = TableQuery[DepartmentsTable]
}
