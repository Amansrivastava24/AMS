package org.example.assets

import slick.jdbc.PostgresProfile.api._
import java.time.LocalDate

final case class Asset(
    id: Long,
    assetCode: String,
    assetTypeId: Long,
    name: String,
    quantity: Int = 1,
    actualFound: Option[Int] = Some(1),
    costCenter: Option[String] = None,
    assetOwnerId: Option[Long] = None,
    custodianId: Option[Long] = None,
    locationId: Option[Long] = None,
    dateOfChecking: Option[LocalDate] = None,
    taggingStatus: Option[String] = None,
    makeModel: Option[String] = None,
    remarks: Option[String] = None,
    assetTag: Option[String] = None,
    serialNumber: Option[String] = None,
    serialNumberFound: Option[String] = None,
    status: String = "AVAILABLE",
    verificationStatus: String = "NOT_CHECKED",
    gatePassNumber: Option[String] = None
)

final case class AssetFilter(
    search: Option[String] = None,
    assetCode: Option[String] = None,
    assetTag: Option[String] = None,
    serialNumber: Option[String] = None,
    name: Option[String] = None,
    status: Option[String] = None,
    verificationStatus: Option[String] = None,
    assetTypeId: Option[Long] = None,
    assetOwnerId: Option[Long] = None,
    custodianId: Option[Long] = None,
    departmentId: Option[Long] = None,
    locationId: Option[Long] = None,
    floor: Option[String] = None,
    roomLocation: Option[String] = None,
    costCenter: Option[String] = None,
    taggingStatus: Option[String] = None,
    dateOfChecking: Option[LocalDate] = None,
    sortBy: Option[String] = None,
    sortOrder: Option[String] = None
)

final case class AssetExportRow(
    id: Long,
    assetCode: String,
    assetTag: Option[String],
    serialNumber: Option[String],
    serialNumberFound: Option[String],
    name: String,
    assetTypeName: String,
    status: String,
    verificationStatus: String,
    quantity: Int,
    actualFound: Option[Int],
    costCenter: Option[String],
    assetOwnerName: Option[String],
    custodianName: Option[String],
    locationDescription: Option[String],
    seatNo: Option[String],
    floorNo: Option[String],
    city: Option[String],
    country: Option[String],
    dateOfChecking: Option[LocalDate],
    gatePassNumber: Option[String],
    taggingStatus: Option[String],
    makeModel: Option[String],
    remarks: Option[String]
)

final class AssetsTable(tag: Tag)
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
  def assetTag = column[Option[String]]("asset_tag")
  def serialNumber = column[Option[String]]("serial_number")
  def serialNumberFound = column[Option[String]]("serial_number_found")
  def status = column[String]("status")
  def verificationStatus = column[String]("verification_status")
  def gatePassNumber = column[Option[String]]("gate_pass_number")

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
    remarks,
    assetTag,
    serialNumber,
    serialNumberFound,
    status,
    verificationStatus,
    gatePassNumber
  ) <> (Asset.tupled, Asset.unapply)
}

object AssetsTable {
  val query = TableQuery[AssetsTable]
}
