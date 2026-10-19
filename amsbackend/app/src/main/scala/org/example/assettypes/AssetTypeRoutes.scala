package org.example.assettypes

import org.apache.pekko.http.scaladsl.model.StatusCodes
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route
import org.example.auth.AuthDirectives
import org.example.common._

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}

final class AssetTypeRoutes(service: AssetTypeService)(
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
    pathPrefix("api" / "asset-types") {
      pathEndOrSingleSlash {
        // GET /api/asset-types
        AuthDirectives.authenticated { _ =>
          get {
            onComplete(service.listAssetTypes()) {
              case Success(types) =>
                complete(JsonSupport.jsonResponse(StatusCodes.OK, types))
              case Failure(ex) =>
                complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve asset types"))
            }
          }
        } ~
        // POST /api/asset-types
        adminOnly {
          post {
            entity(as[String]) { body =>
              JsonSupport.fromJson[AssetTypeRequest](body) match {
                case Success(req) =>
                  onComplete(service.createAssetType(req.name)) {
                    case Success(Right(t)) =>
                      complete(JsonSupport.jsonResponse(StatusCodes.Created, t))
                    case Success(Left(err)) =>
                      complete(JsonSupport.handleServiceError(err))
                    case Failure(ex) =>
                      complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to create asset type"))
                  }
                case Failure(_) =>
                  complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
              }
            }
          }
        }
      } ~
      path(LongNumber) { id =>
        // GET /api/asset-types/{id}
        AuthDirectives.authenticated { _ =>
          get {
            onComplete(service.getAssetType(id)) {
              case Success(Some(t)) =>
                complete(JsonSupport.jsonResponse(StatusCodes.OK, t))
              case Success(None) =>
                complete(JsonSupport.simpleError(StatusCodes.NotFound, "Asset type not found"))
              case Failure(ex) =>
                complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve asset type"))
            }
          }
        } ~
        // PUT /api/asset-types/{id}
        adminOnly {
          put {
            entity(as[String]) { body =>
              JsonSupport.fromJson[AssetTypeRequest](body) match {
                case Success(req) =>
                  onComplete(service.updateAssetType(id, req.name)) {
                    case Success(Right(t)) =>
                      complete(JsonSupport.jsonResponse(StatusCodes.OK, t))
                    case Success(Left(err)) =>
                      complete(JsonSupport.handleServiceError(err))
                    case Failure(ex) =>
                      complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to update asset type"))
                  }
                case Failure(_) =>
                  complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
              }
            }
          }
        } ~
        // DELETE /api/asset-types/{id}
        adminOnly {
          delete {
            onComplete(service.deleteAssetType(id)) {
              case Success(Right(_)) =>
                complete(StatusCodes.NoContent)
              case Success(Left(err)) =>
                complete(JsonSupport.handleServiceError(err))
              case Failure(ex) =>
                complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to delete asset type"))
            }
          }
        }
      }
    }
}
