package org.example.locations

import org.apache.pekko.http.scaladsl.model.StatusCodes
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route
import org.example.auth.AuthDirectives
import org.example.common._

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}

final class LocationRoutes(service: LocationService)(
    implicit executionContext: ExecutionContext
) {

  private val adminRoles = Set("ADMIN", "SUPER_ADMIN")

  private def adminOnly(inner: => Route): Route =
    AuthDirectives.authenticated { claims =>
      if (AuthDirectives.hasRole(claims, adminRoles)) {
        inner
      } else {
        AuthDirectives.forbidden
      }
    }

  val route: Route =
    pathPrefix("api" / "locations") {
      pathEndOrSingleSlash {
        // GET /api/locations
        AuthDirectives.authenticated { _ =>
          get {
            parameters("search".?, "floor".?) { (search, floor) =>
              onComplete(service.listLocations(search, floor)) {
                case Success(locations) =>
                  complete(JsonSupport.jsonResponse(StatusCodes.OK, locations))
                case Failure(ex) =>
                  complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve locations"))
              }
            }
          }
        } ~
        // POST /api/locations
        adminOnly {
          post {
            entity(as[String]) { body =>
              JsonSupport.fromJson[LocationRequest](body) match {
                case Success(req) =>
                  onComplete(service.createLocation(req)) {
                    case Success(Right(loc)) =>
                      complete(JsonSupport.jsonResponse(StatusCodes.Created, loc))
                    case Success(Left(err)) =>
                      complete(JsonSupport.handleServiceError(err))
                    case Failure(ex) =>
                      complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to create location"))
                  }
                case Failure(_) =>
                  complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
              }
            }
          }
        }
      } ~
      path(LongNumber) { id =>
        // GET /api/locations/{id}
        AuthDirectives.authenticated { _ =>
          get {
            onComplete(service.getLocation(id)) {
              case Success(Some(loc)) =>
                complete(JsonSupport.jsonResponse(StatusCodes.OK, loc))
              case Success(None) =>
                complete(JsonSupport.simpleError(StatusCodes.NotFound, "Location not found"))
              case Failure(ex) =>
                complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve location"))
            }
          }
        } ~
        // PUT /api/locations/{id}
        adminOnly {
          put {
            entity(as[String]) { body =>
              JsonSupport.fromJson[LocationRequest](body) match {
                case Success(req) =>
                  onComplete(service.updateLocation(id, req)) {
                    case Success(Right(loc)) =>
                      complete(JsonSupport.jsonResponse(StatusCodes.OK, loc))
                    case Success(Left(err)) =>
                      complete(JsonSupport.handleServiceError(err))
                    case Failure(ex) =>
                      complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to update location"))
                  }
                case Failure(_) =>
                  complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
              }
            }
          }
        } ~
        // DELETE /api/locations/{id}
        adminOnly {
          delete {
            onComplete(service.deleteLocation(id)) {
              case Success(Right(_)) =>
                complete(StatusCodes.NoContent)
              case Success(Left(err)) =>
                complete(JsonSupport.handleServiceError(err))
              case Failure(ex) =>
                complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to delete location"))
            }
          }
        }
      }
    }
}
