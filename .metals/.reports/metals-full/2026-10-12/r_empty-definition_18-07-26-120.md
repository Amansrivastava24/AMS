error id: file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/assets/Asset.scala:
file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/assets/Asset.scala
empty definition using pc, found symbol in pc: 
empty definition using semanticdb
empty definition using fallback
non-local guesses:
	 -slick/jdbc/PostgresProfile.api.Long#
	 -Long#
	 -scala/Predef.Long#
offset: 318
uri: file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/assets/Asset.scala
text:
```scala

package org.example.assets

import slick.jdbc.PostgresProfile.api._

import java.time.LocalDate

case class Asset(
    id: Long,
    assetCode: String,
    assetTypeId: Long,
    name: String,
    quantity: Int,
    actualFound: Option[Int],
    costCenter: Option[String],
    assetOwnerId: Option[Lon@@g],
    custodianId: Option[Long],
    locationId: Option[Long],
    dateOfChecking: Option[LocalDate],
    taggingStatus: Option[String],
    makeModel: Option[String],
    remarks: Option[String]
)

class AssetsTable(tag: Tag)
    extends Table[Asset](tag, "assets") {

  def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
  def assetCode = column[String]("asset_code")
  def assetTypeId = column[Long]("asset_type_id")
  def name = column[String]("name")
  def quantity = column[Int]("quantity")
  def actualFound = column[Option[Int]]("actual_found")
  def costCenter = column[Option[String]]("cost_center")
  def assetOwnerId = column[Option[Long]]("asset_owner_id")
  def custodianId = column[Option[Long]]("custodian_id")
  def locationId = column[Option[Long]]("location_id")
  def dateOfChecking = column[Option[LocalDate]]("date_of_checking")
  def taggingStatus = column[Option[String]]("tagging_status")
  def makeModel = column[Option[String]]("make_model")
  def remarks = column[Option[String]]("remarks")

  def * = (
    id,
    assetCode,
    assetTypeId,
    name,
    quantity,
    actualFound,
    costCenter,
    assetOwnerId,
    custodianId,
    locationId,
    dateOfChecking,
    taggingStatus,
    makeModel,
    remarks
  ) <> (Asset.tupled, Asset.unapply)
}

object AssetsTable {
  val query = TableQuery[AssetsTable]
}

```


#### Short summary: 

empty definition using pc, found symbol in pc: 