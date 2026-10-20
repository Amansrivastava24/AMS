package org.example.users

import org.apache.pekko.http.scaladsl.model.StatusCodes
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route
import org.example.auth.AuthDirectives
import org.example.common._

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}

final class UserRoutes(service: UserService)(
    implicit executionContext: ExecutionContext
) {

  private val adminRoles = Set("ADMIN", "SUPER_ADMIN")

  private def adminOnly(inner: (Long, String) => Route): Route =
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
    pathPrefix("api" / "users") {
      path("me") {
        AuthDirectives.authenticated { claims =>
          val userId = scala.util.Try(claims.getSubject.toLong).getOrElse(0L)
          val role = Option(claims.get("role", classOf[String])).getOrElse("")
          get {
            onComplete(service.getUser(userId)) {
              case Success(Some(user)) =>
                complete(JsonSupport.jsonResponse(StatusCodes.OK, user))
              case Success(None) =>
                complete(JsonSupport.simpleError(StatusCodes.NotFound, "User not found"))
              case Failure(ex) =>
                complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve user"))
            }
          } ~
          put {
            entity(as[String]) { body =>
              JsonSupport.fromJson[UpdateUserRequest](body) match {
                case Success(req) =>
                  onComplete(service.updateUser(userId, role, userId, req)) {
                    case Success(Right(user)) =>
                      complete(JsonSupport.jsonResponse(StatusCodes.OK, user))
                    case Success(Left(err)) =>
                      complete(JsonSupport.handleServiceError(err))
                    case Failure(ex) =>
                      complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to update profile"))
                  }
                case Failure(_) =>
                  complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
              }
            }
          }
        }
      } ~
      pathEndOrSingleSlash {
        // GET /api/users
        adminOnly { (_, _) =>
          get {
            parameters(
              "page".as[Int].?(1),
              "pageSize".as[Int].?(20),
              "search".?,
              "employeeId".?,
              "email".?,
              "role".?,
              "departmentId".as[Long].?,
              "status".?
            ) { (page, pageSize, search, employeeId, email, role, departmentId, status) =>
              if (page < 1 || pageSize < 1 || pageSize > 100) {
                complete(JsonSupport.simpleError(StatusCodes.BadRequest, "page must be >= 1 and pageSize must be between 1 and 100"))
              } else {
                onComplete(service.listUsers(page, pageSize, search, employeeId, email, role, departmentId, status)) {
                  case Success(pageResult) =>
                    complete(JsonSupport.jsonResponse(StatusCodes.OK, pageResult))
                  case Failure(ex) =>
                    complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve users"))
                }
              }
            }
          }
        } ~
        // POST /api/users
        adminOnly { (_, callerRole) =>
          post {
            entity(as[String]) { body =>
              JsonSupport.fromJson[CreateUserRequest](body) match {
                case Success(req) =>
                  onComplete(service.createUser(callerRole, req)) {
                    case Success(Right(user)) =>
                      complete(JsonSupport.jsonResponse(StatusCodes.Created, user))
                    case Success(Left(err)) =>
                      complete(JsonSupport.handleServiceError(err))
                    case Failure(ex) =>
                      ex.printStackTrace()
                      complete(JsonSupport.simpleError(StatusCodes.InternalServerError, s"Failed to create user: ${ex.getMessage}"))
                  }
                case Failure(ex) =>
                  ex.printStackTrace()
                  complete(JsonSupport.simpleError(StatusCodes.BadRequest, s"Invalid JSON request: ${ex.getMessage}"))
              }
            }
          }
        }
      } ~
      pathPrefix(LongNumber) { id =>
        pathEndOrSingleSlash {
          // GET /api/users/{id}
          adminOnly { (_, _) =>
            get {
              onComplete(service.getUser(id)) {
                case Success(Some(user)) =>
                  complete(JsonSupport.jsonResponse(StatusCodes.OK, user))
                case Success(None) =>
                  complete(JsonSupport.simpleError(StatusCodes.NotFound, "User not found"))
                case Failure(ex) =>
                  complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve user"))
              }
            }
          } ~
          // PUT /api/users/{id}
          adminOnly { (callerId, callerRole) =>
            put {
              entity(as[String]) { body =>
                JsonSupport.fromJson[UpdateUserRequest](body) match {
                  case Success(req) =>
                    onComplete(service.updateUser(callerId, callerRole, id, req)) {
                      case Success(Right(user)) =>
                        complete(JsonSupport.jsonResponse(StatusCodes.OK, user))
                      case Success(Left(err)) =>
                        complete(JsonSupport.handleServiceError(err))
                      case Failure(ex) =>
                        complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to update user"))
                    }
                  case Failure(_) =>
                    complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
                }
              }
            }
          } ~
          // DELETE /api/users/{id}
          adminOnly { (callerId, callerRole) =>
            delete {
              onComplete(service.deleteUser(callerId, callerRole, id)) {
                case Success(Right(_)) =>
                  complete(StatusCodes.NoContent)
                case Success(Left(err)) =>
                  complete(JsonSupport.handleServiceError(err))
                case Failure(ex) =>
                  complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to delete user"))
              }
            }
          }
        } ~
        // PATCH /api/users/{id}/status
        path("status") {
          adminOnly { (callerId, callerRole) =>
            patch {
              entity(as[String]) { body =>
                JsonSupport.fromJson[UpdateStatusRequest](body) match {
                  case Success(req) =>
                    onComplete(service.updateStatus(callerId, callerRole, id, req.status)) {
                      case Success(Right(user)) =>
                        complete(JsonSupport.jsonResponse(StatusCodes.OK, user))
                      case Success(Left(err)) =>
                        complete(JsonSupport.handleServiceError(err))
                      case Failure(ex) =>
                        complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to update user status"))
                    }
                  case Failure(_) =>
                    complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
                }
              }
            }
          }
        } ~
        // PATCH /api/users/{id}/role
        path("role") {
          adminOnly { (callerId, callerRole) =>
            patch {
              entity(as[String]) { body =>
                JsonSupport.fromJson[UpdateRoleRequest](body) match {
                  case Success(req) =>
                    onComplete(service.updateRole(callerId, callerRole, id, req.cleanRoleId)) {
                      case Success(Right(user)) =>
                        complete(JsonSupport.jsonResponse(StatusCodes.OK, user))
                      case Success(Left(err)) =>
                        complete(JsonSupport.handleServiceError(err))
                      case Failure(ex) =>
                        complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to update user role"))
                    }
                  case Failure(_) =>
                    complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
                }
              }
            }
          }
        }
      }
    } ~
    pathPrefix("api" / "roles") {
      pathEndOrSingleSlash {
        AuthDirectives.authenticated { _ =>
          get {
            onComplete(service.listRoles()) {
              case Success(roles) =>
                complete(JsonSupport.jsonResponse(StatusCodes.OK, roles))
              case Failure(_) =>
                complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve roles"))
            }
          }
        }
      }
    } ~
    pathPrefix("api" / "custodians") {
      pathEndOrSingleSlash {
        AuthDirectives.authenticated { _ =>
          get {
            onComplete(service.listCustodians()) {
              case Success(custodians) =>
                complete(JsonSupport.jsonResponse(StatusCodes.OK, custodians))
              case Failure(_) =>
                complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve custodians"))
            }
          }
        }
      }
    }
}
