package org.example.assets

import org.example.common._
import java.time.LocalDate
import scala.concurrent.{ExecutionContext, Future}

final class AssetService(val repository: AssetRepository)(
    implicit executionContext: ExecutionContext
) {

  private val validTaggingStatuses = Set("T", "NA", "TR")
  private val validStatuses = Set(
    "AVAILABLE",
    "ASSIGNED",
    "UNDER_REPAIR",
    "LOST",
    "DAMAGED",
    "RETIRED",
    "DISPOSED"
  )
  private val validVerificationStatuses = Set("NOT_CHECKED", "FOUND", "MISSING")

  private def validateAssetData(asset: Asset): Option[String] = {
    if (asset.assetCode == null || asset.assetCode.trim.isEmpty) {
      Some("Asset code must not be empty")
    } else if (asset.name == null || asset.name.trim.isEmpty) {
      Some("Asset name must not be empty")
    } else if (asset.quantity < 0) {
      Some("Quantity must be greater than or equal to 0")
    } else if (asset.actualFound.exists(af => af < 0 || af > asset.quantity)) {
      Some("Actual found must be between 0 and total quantity")
    } else if (asset.taggingStatus.exists(ts => !validTaggingStatuses.contains(ts.trim.toUpperCase))) {
      Some("Tagging status must be one of: T, NA, TR")
    } else if (!validStatuses.contains(asset.status.trim.toUpperCase)) {
      Some(s"Status must be one of: ${validStatuses.mkString(", ")}")
    } else if (!validVerificationStatuses.contains(asset.verificationStatus.trim.toUpperCase)) {
      Some(s"Verification status must be one of: ${validVerificationStatuses.mkString(", ")}")
    } else {
      None
    }
  }

  private def validateForeignKeys(asset: Asset): Future[Either[ServiceError, Unit]] = {
    repository.isAssetTypeValid(asset.assetTypeId).flatMap { typeValid =>
      if (!typeValid) {
        Future.successful(Left(ValidationError(s"Asset type ID ${asset.assetTypeId} does not exist")))
      } else {
        val ownerCheck = asset.assetOwnerId match {
          case Some(oid) => repository.isUserValid(oid)
          case None => Future.successful(true)
        }
        ownerCheck.flatMap { ownerValid =>
          if (!ownerValid) {
            Future.successful(Left(ValidationError(s"Asset owner ID ${asset.assetOwnerId.get} does not exist")))
          } else {
            val custodianCheck = asset.custodianId match {
              case Some(cid) => repository.isUserValid(cid)
              case None => Future.successful(true)
            }
            custodianCheck.flatMap { custodianValid =>
              if (!custodianValid) {
                Future.successful(Left(ValidationError(s"Custodian ID ${asset.custodianId.get} does not exist")))
              } else {
                val locCheck = asset.locationId match {
                  case Some(lid) => repository.isLocationValid(lid)
                  case None => Future.successful(true)
                }
                locCheck.map { locValid =>
                  if (!locValid) {
                    Left(ValidationError(s"Location ID ${asset.locationId.get} does not exist"))
                  } else {
                    Right(())
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  def getAssets(page: Int, pageSize: Int, filter: AssetFilter): Future[AssetPage] =
    repository.findAll(page, pageSize, filter)

  def getAsset(id: Long): Future[Option[Asset]] =
    repository.findById(id)

  def createAsset(asset: Asset): Future[Either[ServiceError, Asset]] = {
    validateAssetData(asset) match {
      case Some(err) => Future.successful(Left(ValidationError(err)))
      case None =>
        repository.findByCode(asset.assetCode).flatMap {
          case Some(_) =>
            Future.successful(Left(ConflictError(s"Asset with code '${asset.assetCode}' already exists")))
          case None =>
            val tagCheck = asset.assetTag match {
              case Some(tag) if tag.trim.nonEmpty => repository.findByTag(tag)
              case _ => Future.successful(None)
            }
            tagCheck.flatMap {
              case Some(_) =>
                Future.successful(Left(ConflictError(s"Asset with tag '${asset.assetTag.get}' already exists")))
              case None =>
                validateForeignKeys(asset).flatMap {
                  case Left(err) => Future.successful(Left(err))
                  case Right(_)  => repository.create(asset).map(Right(_))
                }
            }
        }
    }
  }

  def updateAsset(id: Long, asset: Asset): Future[Either[ServiceError, Asset]] =
    updateAsset(0L, "SUPER_ADMIN", id, asset)

  def updateAsset(
      callerId: Long,
      callerRole: String,
      id: Long,
      asset: Asset
  ): Future[Either[ServiceError, Asset]] = {
    validateAssetData(asset) match {
      case Some(err) => Future.successful(Left(ValidationError(err)))
      case None =>
        repository.findById(id).flatMap {
          case None => Future.successful(Left(NotFoundError("Asset not found")))
          case Some(existing) =>
            if (callerRole == "CUSTODIAN" && !existing.custodianId.contains(callerId)) {
              Future.successful(Left(ForbiddenError("You are not authorized to update this asset")))
            } else if (callerRole == "CUSTODIAN" && (asset.custodianId != existing.custodianId || asset.assetOwnerId != existing.assetOwnerId)) {
              Future.successful(Left(ForbiddenError("Custodians cannot change custodian assignment or asset ownership")))
            } else {
              val safeAsset = if (callerRole == "CUSTODIAN") {
                asset.copy(custodianId = existing.custodianId, assetOwnerId = existing.assetOwnerId)
              } else {
                asset
              }
              repository.findByCode(safeAsset.assetCode).flatMap {
                case Some(existingCode) if existingCode.id != id =>
                  Future.successful(Left(ConflictError(s"Asset with code '${safeAsset.assetCode}' already exists")))
                case _ =>
                  val tagCheck = safeAsset.assetTag match {
                    case Some(tag) if tag.trim.nonEmpty => repository.findByTag(tag)
                    case _ => Future.successful(None)
                  }
                  tagCheck.flatMap {
                    case Some(existingTag) if existingTag.id != id =>
                      Future.successful(Left(ConflictError(s"Asset with tag '${safeAsset.assetTag.get}' already exists")))
                    case _ =>
                      validateForeignKeys(safeAsset).flatMap {
                        case Left(err) => Future.successful(Left(err))
                        case Right(_) =>
                          repository.update(id, safeAsset).map {
                            case Some(a) => Right(a)
                            case None    => Left(NotFoundError("Asset not found"))
                          }
                      }
                  }
              }
            }
        }
    }
  }

  def updateVerification(
      id: Long,
      verificationStatus: String,
      serialNumberFound: Option[String],
      dateOfChecking: Option[LocalDate]
  ): Future[Either[ServiceError, Asset]] =
    updateVerification(0L, "SUPER_ADMIN", id, verificationStatus, serialNumberFound, dateOfChecking)

  def updateVerification(
      callerId: Long,
      callerRole: String,
      id: Long,
      verificationStatus: String,
      serialNumberFound: Option[String],
      dateOfChecking: Option[LocalDate]
  ): Future[Either[ServiceError, Asset]] = {
    val cleanStatus = verificationStatus.trim.toUpperCase
    if (!validVerificationStatuses.contains(cleanStatus)) {
      Future.successful(Left(ValidationError(s"Verification status must be one of: ${validVerificationStatuses.mkString(", ")}")))
    } else {
      repository.findById(id).flatMap {
        case None => Future.successful(Left(NotFoundError("Asset not found")))
        case Some(existing) =>
          if (callerRole == "CUSTODIAN" && !existing.custodianId.contains(callerId)) {
            Future.successful(Left(ForbiddenError("You are not authorized to verify this asset")))
          } else {
            repository.updateVerification(id, cleanStatus, serialNumberFound, dateOfChecking).map {
              case Some(updated) => Right(updated)
              case None          => Left(NotFoundError("Asset not found"))
            }
          }
      }
    }
  }

  def deleteAsset(id: Long): Future[Either[ServiceError, Boolean]] = {
    repository.findById(id).flatMap {
      case None => Future.successful(Left(NotFoundError("Asset not found")))
      case Some(_) =>
        repository.delete(id).map(_ => Right(true))
    }
  }

  def getAssetsForExport(filter: AssetFilter): Future[Seq[AssetExportRow]] =
    repository.findForExport(filter)
}