package org.example.departments

import org.apache.pekko.http.scaladsl.model.StatusCodes
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route
import org.example.auth.AuthDirectives
import org.example.common._

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}

final class DepartmentRoutes(service: DepartmentService)(
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
    pathPrefix("api" / "departments") {
      pathEndOrSingleSlash {
        // GET /api/departments
        AuthDirectives.authenticated { _ =>
          get {
            onComplete(service.listDepartments()) {
              case Success(deps) =>
                complete(JsonSupport.jsonResponse(StatusCodes.OK, deps))
              case Failure(ex) =>
                complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve departments"))
            }
          }
        } ~
        // POST /api/departments
        adminOnly {
          post {
            entity(as[String]) { body =>
              JsonSupport.fromJson[DepartmentRequest](body) match {
                case Success(req) =>
                  onComplete(service.createDepartment(req.name)) {
                    case Success(Right(dep)) =>
                      complete(JsonSupport.jsonResponse(StatusCodes.Created, dep))
                    case Success(Left(err)) =>
                      complete(JsonSupport.handleServiceError(err))
                    case Failure(ex) =>
                      complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to create department"))
                  }
                case Failure(_) =>
                  complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
              }
            }
          }
        }
      } ~
      path(LongNumber) { id =>
        // GET /api/departments/{id}
        AuthDirectives.authenticated { _ =>
          get {
            onComplete(service.getDepartment(id)) {
              case Success(Some(dep)) =>
                complete(JsonSupport.jsonResponse(StatusCodes.OK, dep))
              case Success(None) =>
                complete(JsonSupport.simpleError(StatusCodes.NotFound, "Department not found"))
              case Failure(ex) =>
                complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve department"))
            }
          }
        } ~
        // PUT /api/departments/{id}
        adminOnly {
          put {
            entity(as[String]) { body =>
              JsonSupport.fromJson[DepartmentRequest](body) match {
                case Success(req) =>
                  onComplete(service.updateDepartment(id, req.name)) {
                    case Success(Right(dep)) =>
                      complete(JsonSupport.jsonResponse(StatusCodes.OK, dep))
                    case Success(Left(err)) =>
                      complete(JsonSupport.handleServiceError(err))
                    case Failure(ex) =>
                      complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to update department"))
                  }
                case Failure(_) =>
                  complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
              }
            }
          }
        } ~
        // DELETE /api/departments/{id}
        adminOnly {
          delete {
            onComplete(service.deleteDepartment(id)) {
              case Success(Right(_)) =>
                complete(StatusCodes.NoContent)
              case Success(Left(err)) =>
                complete(JsonSupport.handleServiceError(err))
              case Failure(ex) =>
                complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to delete department"))
            }
          }
        }
      }
    }
}
