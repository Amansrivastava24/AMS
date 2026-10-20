package org.example.assets

import java.time.LocalDate

final case class InlineLocationRequest(
    description: String,
    seatNo: Option[String] = None,
    floorNo: Option[String] = None
)

final case class CreateAssetRequest(
    assetCode: String,
    assetTypeId: Any,
    name: String,
    quantity: Option[Any] = None,
    actualFound: Option[Any] = None,
    costCenter: Option[String] = None,
    assetOwnerId: Option[Any] = None,
    custodianId: Option[Any] = None,
    locationId: Option[Any] = None,
    dateOfChecking: Option[LocalDate] = None,
    taggingStatus: Option[String] = None,
    makeModel: Option[String] = None,
    remarks: Option[String] = None,
    assetTag: Option[String] = None,
    serialNumber: Option[String] = None,
    serialNumberFound: Option[String] = None,
    status: Option[String] = None,
    verificationStatus: Option[String] = None,
    gatePassNumber: Option[String] = None,
    newLocation: Option[InlineLocationRequest] = None
) {
  private def toOptionLong(v: Option[Any]): Option[Long] = v match {
    case Some(n: Number) => Some(n.longValue())
    case Some(s: String) if s.trim.nonEmpty => scala.util.Try(s.trim.toLong).toOption
    case _ => None
  }

  private def toOptionInt(v: Option[Any]): Option[Int] = v match {
    case Some(n: Number) => Some(n.intValue())
    case Some(s: String) if s.trim.nonEmpty => scala.util.Try(s.trim.toInt).toOption
    case _ => None
  }

  def cleanAssetTypeId: Long = assetTypeId match {
    case n: Number => n.longValue()
    case s: String if s.trim.nonEmpty => scala.util.Try(s.trim.toLong).getOrElse(0L)
    case _ => 0L
  }

  def cleanLocationId: Option[Long] = toOptionLong(locationId)

  def toAsset: Asset =
    Asset(
      id = 0L,
      assetCode = assetCode.trim,
      assetTypeId = cleanAssetTypeId,
      name = name.trim,
      quantity = toOptionInt(quantity).getOrElse(1),
      actualFound = toOptionInt(actualFound).orElse(Some(1)),
      costCenter = costCenter.map(_.trim).filter(_.nonEmpty),
      assetOwnerId = toOptionLong(assetOwnerId),
      custodianId = toOptionLong(custodianId),
      locationId = toOptionLong(locationId),
      dateOfChecking = dateOfChecking,
      taggingStatus = taggingStatus.map(_.trim.toUpperCase).filter(_.nonEmpty),
      makeModel = makeModel.map(_.trim).filter(_.nonEmpty),
      remarks = remarks.map(_.trim).filter(_.nonEmpty),
      assetTag = assetTag.map(_.trim).filter(_.nonEmpty),
      serialNumber = serialNumber.map(_.trim).filter(_.nonEmpty),
      serialNumberFound = serialNumberFound.map(_.trim).filter(_.nonEmpty),
      status = status.map(_.trim.toUpperCase).filter(_.nonEmpty).getOrElse("AVAILABLE"),
      verificationStatus = verificationStatus.map(_.trim.toUpperCase).filter(_.nonEmpty).getOrElse("NOT_CHECKED"),
      gatePassNumber = gatePassNumber.map(_.trim).filter(_.nonEmpty)
    )
}

final case class UpdateVerificationRequest(
    verificationStatus: String,
    serialNumberFound: Option[String] = None,
    dateOfChecking: Option[LocalDate] = None
)