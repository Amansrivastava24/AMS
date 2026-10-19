package org.example.assettypes

import org.example.common._
import scala.concurrent.{ExecutionContext, Future}

final class AssetTypeService(
    repository: AssetTypeRepository
)(implicit executionContext: ExecutionContext) {

  def listAssetTypes(): Future[Seq[AssetType]] =
    repository.findAll()

  def getAssetType(id: Long): Future[Option[AssetType]] =
    repository.findById(id)

  def createAssetType(name: String): Future[Either[ServiceError, AssetType]] = {
    val clean = Option(name).map(_.trim).getOrElse("")
    if (clean.isEmpty) {
      Future.successful(Left(ValidationError("Asset type name must not be empty")))
    } else if (clean.length > 100) {
      Future.successful(Left(ValidationError("Asset type name must not exceed 100 characters")))
    } else {
      repository.findByName(clean).flatMap {
        case Some(_) =>
          Future.successful(Left(ConflictError(s"Asset type with name '$clean' already exists")))
        case None =>
          repository.create(clean).map(Right(_))
      }
    }
  }

  def updateAssetType(id: Long, name: String): Future[Either[ServiceError, AssetType]] = {
    val clean = Option(name).map(_.trim).getOrElse("")
    if (clean.isEmpty) {
      Future.successful(Left(ValidationError("Asset type name must not be empty")))
    } else if (clean.length > 100) {
      Future.successful(Left(ValidationError("Asset type name must not exceed 100 characters")))
    } else {
      repository.findById(id).flatMap {
        case None =>
          Future.successful(Left(NotFoundError("Asset type not found")))
        case Some(_) =>
          repository.findByName(clean).flatMap {
            case Some(existing) if existing.id != id =>
              Future.successful(Left(ConflictError(s"Asset type with name '$clean' already exists")))
            case _ =>
              repository.update(id, clean).map {
                case Some(t) => Right(t)
                case None => Left(NotFoundError("Asset type not found"))
              }
          }
      }
    }
  }

  def deleteAssetType(id: Long): Future[Either[ServiceError, Boolean]] = {
    repository.findById(id).flatMap {
      case None =>
        Future.successful(Left(NotFoundError("Asset type not found")))
      case Some(_) =>
        repository.isReferenced(id).flatMap { referenced =>
          if (referenced) {
            Future.successful(Left(ConflictError("Cannot delete asset type because it is referenced by existing assets")))
          } else {
            repository.delete(id).map(Right(_))
          }
        }
    }
  }
}
