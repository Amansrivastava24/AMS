package org.example.assettypes

import slick.jdbc.PostgresProfile.api._

case class AssetType(
    id: Long,
    name: String
)

case class AssetTypeRequest(
    name: String
)

class AssetTypesTable(tag: Tag) extends Table[AssetType](tag, "asset_types") {
  def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
  def name = column[String]("name")

  def * = (id, name) <> (AssetType.tupled, AssetType.unapply)
}

object AssetTypesTable {
  val query = TableQuery[AssetTypesTable]
}
