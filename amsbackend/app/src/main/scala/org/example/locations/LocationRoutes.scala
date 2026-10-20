package org.example.locations

import org.apache.pekko.http.scaladsl.model.StatusCodes
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route
import org.example.auth.AuthDirectives
import org.example.common._
import org.example.users.UserRepository

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}

final class LocationRoutes(
    service: LocationService,
    userRepository: UserRepository
)(
    implicit executionContext: ExecutionContext
) {

  def this(service: LocationService)(implicit ec: ExecutionContext) =
    this(service, new UserRepository(service.repository.database))

  private val adminRoles = Set("ADMIN", "SUPER_ADMIN")

  private def adminOnlyWithUser(inner: (Long, String) => Route): Route =
    AuthDirectives.authenticated { claims =>
      val role = Option(claims.get("role", classOf[String])).getOrElse("")
      val userId = scala.util.Try(claims.getSubject.toLong).getOrElse(0L)
      if (adminRoles.contains(role) && userId > 0) {
        inner(userId, role)
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
        adminOnlyWithUser { (userId, _) =>
          post {
            entity(as[String]) { body =>
              JsonSupport.fromJson[LocationRequest](body) match {
                case Success(req) =>
                  onComplete(userRepository.findById(userId)) {
                    case Success(Some(adminUser)) =>
                      val adminProfile = Some((adminUser.city, adminUser.country))
                      onComplete(service.createLocation(req, adminProfile)) {
                        case Success(Right(loc)) =>
                          complete(JsonSupport.jsonResponse(StatusCodes.Created, loc))
                        case Success(Left(err)) =>
                          complete(JsonSupport.handleServiceError(err))
                        case Failure(ex) =>
                          complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to create location"))
                      }
                    case Success(None) =>
                      complete(JsonSupport.simpleError(StatusCodes.Unauthorized, "Authenticated user not found"))
                    case Failure(_) =>
                      complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to load user profile"))
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
        adminOnlyWithUser { (_, _) =>
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
        adminOnlyWithUser { (_, _) =>
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
