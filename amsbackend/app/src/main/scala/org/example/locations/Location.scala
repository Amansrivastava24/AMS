package org.example.locations

import slick.jdbc.PostgresProfile.api._

case class Location(
    id: Long,
    name: String,
    address: Option[String],
    city: Option[String],
    country: Option[String],
    floor: Option[String],
    roomLocation: Option[String]
)

case class LocationRequest(
    name: String,
    address: Option[String] = None,
    city: Option[String] = None,
    country: Option[String] = None,
    floor: Option[String] = None,
    roomLocation: Option[String] = None
)

class LocationsTable(tag: Tag) extends Table[Location](tag, "locations") {
  def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
  def name = column[String]("name")
  def address = column[Option[String]]("address")
  def city = column[Option[String]]("city")
  def country = column[Option[String]]("country")
  def floor = column[Option[String]]("floor")
  def roomLocation = column[Option[String]]("room_location")

  def * = (id, name, address, city, country, floor, roomLocation) <> (Location.tupled, Location.unapply)
}

object LocationsTable {
  val query = TableQuery[LocationsTable]
}
