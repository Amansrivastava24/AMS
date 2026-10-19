package org.example.locations

import org.example.common._
import scala.concurrent.{ExecutionContext, Future}

final class LocationService(
    repository: LocationRepository
)(implicit executionContext: ExecutionContext) {

  private def validateRequest(req: LocationRequest): Option[String] = {
    val cleanName = Option(req.name).map(_.trim).getOrElse("")
    if (cleanName.isEmpty) Some("Location name must not be empty")
    else if (cleanName.length > 100) Some("Location name must not exceed 100 characters")
    else if (req.address.exists(_.length > 255)) Some("Address must not exceed 255 characters")
    else if (req.city.exists(_.length > 100)) Some("City must not exceed 100 characters")
    else if (req.country.exists(_.length > 100)) Some("Country must not exceed 100 characters")
    else if (req.floor.exists(_.length > 50)) Some("Floor must not exceed 50 characters")
    else if (req.roomLocation.exists(_.length > 255)) Some("Room/location must not exceed 255 characters")
    else None
  }

  def listLocations(search: Option[String] = None, floor: Option[String] = None): Future[Seq[Location]] =
    repository.findAll(search, floor)

  def getLocation(id: Long): Future[Option[Location]] =
    repository.findById(id)

  def createLocation(req: LocationRequest): Future[Either[ServiceError, Location]] = {
    validateRequest(req) match {
      case Some(err) => Future.successful(Left(ValidationError(err)))
      case None => repository.create(req).map(Right(_))
    }
  }

  def updateLocation(id: Long, req: LocationRequest): Future[Either[ServiceError, Location]] = {
    validateRequest(req) match {
      case Some(err) => Future.successful(Left(ValidationError(err)))
      case None =>
        repository.findById(id).flatMap {
          case None => Future.successful(Left(NotFoundError("Location not found")))
          case Some(_) =>
            repository.update(id, req).map {
              case Some(loc) => Right(loc)
              case None => Left(NotFoundError("Location not found"))
            }
        }
    }
  }

  def deleteLocation(id: Long): Future[Either[ServiceError, Boolean]] = {
    repository.findById(id).flatMap {
      case None =>
        Future.successful(Left(NotFoundError("Location not found")))
      case Some(_) =>
        repository.isReferenced(id).flatMap { referenced =>
          if (referenced) {
            Future.successful(Left(ConflictError("Cannot delete location because it is referenced by existing assets or items")))
          } else {
            repository.delete(id).map(Right(_))
          }
        }
    }
  }
}
