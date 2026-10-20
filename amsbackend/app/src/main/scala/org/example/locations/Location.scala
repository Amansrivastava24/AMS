package org.example.locations

import slick.jdbc.PostgresProfile.api._

case class Location(
    id: Long,
    description: String,
    seatNo: Option[String] = None,
    floorNo: Option[String] = None,
    city: Option[String] = None,
    country: Option[String] = None
)

case class LocationRequest(
    description: String,
    seatNo: Option[String] = None,
    floorNo: Option[String] = None,
    city: Option[String] = None,
    country: Option[String] = None
)

class LocationsTable(tag: Tag) extends Table[Location](tag, "locations") {
  def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
  def description = column[String]("description")
  def seatNo = column[Option[String]]("seat_no")
  def floorNo = column[Option[String]]("floor_no")
  def city = column[Option[String]]("city")
  def country = column[Option[String]]("country")

  def * = (id, description, seatNo, floorNo, city, country) <> (Location.tupled, Location.unapply)
}

object LocationsTable {
  val query = TableQuery[LocationsTable]
}
