package org.example.locations

import org.example.common._
import scala.concurrent.{ExecutionContext, Future}

final class LocationService(
    val repository: LocationRepository
)(implicit executionContext: ExecutionContext) {

  private def validateRequest(req: LocationRequest): Option[String] = {
    val cleanDesc = Option(req.description).map(_.trim).getOrElse("")
    if (cleanDesc.isEmpty) Some("Location description must not be empty")
    else if (cleanDesc.length > 255) Some("Location description must not exceed 255 characters")
    else if (req.seatNo.exists(_.length > 50)) Some("Seat number must not exceed 50 characters")
    else if (req.floorNo.exists(_.length > 50)) Some("Floor number must not exceed 50 characters")
    else if (req.city.exists(_.length > 100)) Some("City must not exceed 100 characters")
    else if (req.country.exists(_.length > 100)) Some("Country must not exceed 100 characters")
    else None
  }

  def listLocations(search: Option[String] = None, floor: Option[String] = None): Future[Seq[Location]] =
    repository.findAll(search, floor)

  def getLocation(id: Long): Future[Option[Location]] =
    repository.findById(id)

  def createLocation(
      req: LocationRequest,
      adminProfile: Option[(Option[String], Option[String])] = None
  ): Future[Either[ServiceError, Location]] = {
    validateRequest(req) match {
      case Some(err) => Future.successful(Left(ValidationError(err)))
      case None =>
        adminProfile match {
          case Some((adminCityOpt, adminCountryOpt)) =>
            val city = adminCityOpt.map(_.trim).filter(_.nonEmpty)
            val country = adminCountryOpt.map(_.trim).filter(_.nonEmpty)
            if (city.isEmpty || country.isEmpty) {
              Future.successful(
                Left(
                  ValidationError(
                    "Admin profile is missing City or Country. Please update your profile before creating a location."
                  )
                )
              )
            } else {
              val reqWithAdminProfile = req.copy(city = city, country = country)
              repository.create(reqWithAdminProfile).map(Right(_))
            }
          case None =>
            repository.create(req).map(Right(_))
        }
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
