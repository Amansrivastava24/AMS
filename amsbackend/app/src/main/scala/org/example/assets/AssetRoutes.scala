package org.example.assets

import org.apache.pekko.http.scaladsl.model._
import org.apache.pekko.http.scaladsl.model.headers._
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route
import org.example.auth.AuthDirectives
import org.example.common._
import org.example.export.ExcelExportService
import org.slf4j.LoggerFactory

import java.time.LocalDate
import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success, Try}

final class AssetRoutes(service: AssetService)(
    implicit executionContext: ExecutionContext
) {

  private val logger = LoggerFactory.getLogger(getClass)
  private val adminRoles = Set("ADMIN", "SUPER_ADMIN")
  private val assetModifierRoles = Set("ADMIN", "SUPER_ADMIN", "CUSTODIAN")

  private val xlsxContentType =
    ContentType.parse("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .getOrElse(ContentTypes.`application/octet-stream`)

  private def adminOnly(inner: => Route): Route =
    AuthDirectives.authenticated { claims =>
      if (AuthDirectives.hasRole(claims, adminRoles)) {
        inner
      } else {
        AuthDirectives.forbidden
      }
    }

  private def assetModifierOnly(inner: (Long, String) => Route): Route =
    AuthDirectives.authenticated { claims =>
      val role = Option(claims.get("role", classOf[String])).getOrElse("")
      val userId = Try(claims.getSubject.toLong).getOrElse(0L)
      if (assetModifierRoles.contains(role) && userId > 0) {
        inner(userId, role)
      } else {
        AuthDirectives.forbidden
      }
    }

  private def parseDate(dateStr: Option[String]): Option[LocalDate] =
    dateStr.map(_.trim).filter(_.nonEmpty).flatMap(s => Try(LocalDate.parse(s)).toOption)

  // GET /api/assets
  private def listAssetsRoute: Route =
    AuthDirectives.authenticated { claims =>
      val callerRole = Option(claims.get("role", classOf[String])).getOrElse("")
      val callerId = Try(claims.getSubject.toLong).getOrElse(0L)

      get {
        parameters(
          "page".as[Int].?(1),
          "pageSize".as[Int].?(20),
          "search".?,
          "assetCode".?,
          "assetTag".?,
          "serialNumber".?,
          "name".?,
          "status".?,
          "verificationStatus".?,
          "assetTypeId".as[Long].?,
          "assetOwnerId".as[Long].?,
          "custodianId".as[Long].?,
          "departmentId".as[Long].?,
          "locationId".as[Long].?,
          "floor".?,
          "roomLocation".?,
          "costCenter".?,
          "taggingStatus".?,
          "dateOfChecking".?,
          "sortBy".?,
          "sortOrder".?
        ) { (page, pageSize, search, assetCode, assetTag, serialNumber, name, status, verificationStatus, assetTypeId, assetOwnerId, custodianId, departmentId, locationId, floor, roomLocation, costCenter, taggingStatus, dateOfChecking, sortBy, sortOrder) =>
          if (page < 1 || pageSize < 1 || pageSize > 100) {
            complete(JsonSupport.simpleError(StatusCodes.BadRequest, "page must be >= 1 and pageSize must be between 1 and 100"))
          } else {
            val effectiveCustodianId = if (callerRole == "CUSTODIAN") Some(callerId) else custodianId

            val filter = AssetFilter(
              search = search,
              assetCode = assetCode,
              assetTag = assetTag,
              serialNumber = serialNumber,
              name = name,
              status = status,
              verificationStatus = verificationStatus,
              assetTypeId = assetTypeId,
              assetOwnerId = assetOwnerId,
              custodianId = effectiveCustodianId,
              departmentId = departmentId,
              locationId = locationId,
              floor = floor,
              roomLocation = roomLocation,
              costCenter = costCenter,
              taggingStatus = taggingStatus,
              dateOfChecking = parseDate(dateOfChecking),
              sortBy = sortBy,
              sortOrder = sortOrder
            )

            onComplete(service.getAssets(page, pageSize, filter)) {
              case Success(result) =>
                complete(JsonSupport.jsonResponse(StatusCodes.OK, result))
              case Failure(ex) =>
                logger.error("Failed to retrieve assets", ex)
                complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve assets"))
            }
          }
        }
      }
    }

  // GET /api/assets/export
  private def exportAssetsRoute: Route =
    AuthDirectives.authenticated { claims =>
      val callerRole = Option(claims.get("role", classOf[String])).getOrElse("")
      val callerId = Try(claims.getSubject.toLong).getOrElse(0L)

      get {
        parameters(
          "search".?,
          "assetCode".?,
          "assetTag".?,
          "serialNumber".?,
          "name".?,
          "status".?,
          "verificationStatus".?,
          "assetTypeId".as[Long].?,
          "assetOwnerId".as[Long].?,
          "custodianId".as[Long].?,
          "departmentId".as[Long].?,
          "locationId".as[Long].?,
          "floor".?,
          "roomLocation".?,
          "costCenter".?,
          "taggingStatus".?,
          "dateOfChecking".?,
          "sortBy".?,
          "sortOrder".?
        ) { (search, assetCode, assetTag, serialNumber, name, status, verificationStatus, assetTypeId, assetOwnerId, custodianId, departmentId, locationId, floor, roomLocation, costCenter, taggingStatus, dateOfChecking, sortBy, sortOrder) =>
          val effectiveCustodianId = if (callerRole == "CUSTODIAN") Some(callerId) else custodianId

          val filter = AssetFilter(
            search = search,
            assetCode = assetCode,
            assetTag = assetTag,
            serialNumber = serialNumber,
            name = name,
            status = status,
            verificationStatus = verificationStatus,
            assetTypeId = assetTypeId,
            assetOwnerId = assetOwnerId,
            custodianId = effectiveCustodianId,
            departmentId = departmentId,
            locationId = locationId,
            floor = floor,
            roomLocation = roomLocation,
            costCenter = costCenter,
            taggingStatus = taggingStatus,
            dateOfChecking = parseDate(dateOfChecking),
            sortBy = sortBy,
            sortOrder = sortOrder
          )

          onComplete(service.getAssetsForExport(filter)) {
            case Success(rows) =>
              val bytes = ExcelExportService.generateAssetWorkbook(rows)
              val today = LocalDate.now().toString
              val contentDisposition = `Content-Disposition`(
                ContentDispositionTypes.attachment,
                Map("filename" -> s"assets-export-$today.xlsx")
              )

              respondWithHeaders(contentDisposition) {
                complete(HttpResponse(
                  status = StatusCodes.OK,
                  entity = HttpEntity(xlsxContentType, bytes)
                ))
              }

            case Failure(ex) =>
              logger.error("Failed to export assets to Excel", ex)
              complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to export assets"))
          }
        }
      }
    }

  // POST /api/assets
  private def createAssetRoute: Route =
    AuthDirectives.authenticated { claims =>
      val callerRole = Option(claims.get("role", classOf[String])).getOrElse("")
      val callerId = Try(claims.getSubject.toLong).getOrElse(0L)

      if (!adminRoles.contains(callerRole) || callerId <= 0) {
        AuthDirectives.forbidden
      } else {
        post {
          entity(as[String]) { body =>
            JsonSupport.fromJson[CreateAssetRequest](body) match {
              case Success(req) =>
                onComplete(service.createAsset(callerId, callerRole, req)) {
                  case Success(Right(created)) =>
                    complete(JsonSupport.jsonResponse(StatusCodes.Created, created))
                  case Success(Left(err)) =>
                    complete(JsonSupport.handleServiceError(err))
                  case Failure(ex) =>
                    logger.error("Failed to create asset", ex)
                    complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to create asset"))
                }
              case Failure(_) =>
                complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
            }
          }
        }
      }
    }

  // GET /api/assets/{id}
  private def getAssetRoute(id: Long): Route =
    AuthDirectives.authenticated { claims =>
      val callerRole = Option(claims.get("role", classOf[String])).getOrElse("")
      val callerId = Try(claims.getSubject.toLong).getOrElse(0L)

      get {
        onComplete(service.getAsset(id)) {
          case Success(Some(asset)) =>
            if (callerRole == "CUSTODIAN" && !asset.custodianId.contains(callerId)) {
              complete(JsonSupport.simpleError(StatusCodes.NotFound, "Asset not found"))
            } else {
              complete(JsonSupport.jsonResponse(StatusCodes.OK, asset))
            }
          case Success(None) =>
            complete(JsonSupport.simpleError(StatusCodes.NotFound, "Asset not found"))
          case Failure(ex) =>
            logger.error("Failed to retrieve asset", ex)
            complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to retrieve asset"))
        }
      }
    }

  // PUT /api/assets/{id}
  private def updateAssetRoute(id: Long): Route =
    assetModifierOnly { (callerId, callerRole) =>
      put {
        entity(as[String]) { body =>
          JsonSupport.fromJson[CreateAssetRequest](body) match {
            case Success(req) =>
              onComplete(service.updateAsset(callerId, callerRole, id, req.toAsset)) {
                case Success(Right(updated)) =>
                  complete(JsonSupport.jsonResponse(StatusCodes.OK, updated))
                case Success(Left(err)) =>
                  complete(JsonSupport.handleServiceError(err))
                case Failure(ex) =>
                  logger.error("Failed to update asset", ex)
                  complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to update asset"))
              }
            case Failure(_) =>
              complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
          }
        }
      }
    }

  // PATCH /api/assets/{id}/verification
  private def updateVerificationRoute(id: Long): Route =
    assetModifierOnly { (callerId, callerRole) =>
      patch {
        path("verification") {
          entity(as[String]) { body =>
            JsonSupport.fromJson[UpdateVerificationRequest](body) match {
              case Success(req) =>
                onComplete(service.updateVerification(callerId, callerRole, id, req.verificationStatus, req.serialNumberFound, req.dateOfChecking)) {
                  case Success(Right(updated)) =>
                    complete(JsonSupport.jsonResponse(StatusCodes.OK, updated))
                  case Success(Left(err)) =>
                    complete(JsonSupport.handleServiceError(err))
                  case Failure(ex) =>
                    logger.error("Failed to update asset verification", ex)
                    complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to update asset verification"))
                }
              case Failure(_) =>
                complete(JsonSupport.simpleError(StatusCodes.BadRequest, "Invalid JSON request"))
            }
          }
        }
      }
    }

  // DELETE /api/assets/{id}
  private def deleteAssetRoute(id: Long): Route =
    adminOnly {
      delete {
        onComplete(service.deleteAsset(id)) {
          case Success(Right(_)) =>
            complete(StatusCodes.NoContent)
          case Success(Left(err)) =>
            complete(JsonSupport.handleServiceError(err))
          case Failure(ex) =>
            logger.error(s"Failed to delete asset $id", ex)
            complete(JsonSupport.simpleError(StatusCodes.InternalServerError, "Failed to delete asset"))
        }
      }
    }

  val route: Route =
    pathPrefix("api" / "assets") {
      pathEndOrSingleSlash {
        listAssetsRoute ~ createAssetRoute
      } ~
      path("export") {
        exportAssetsRoute
      } ~
      pathPrefix(LongNumber) { id =>
        pathEndOrSingleSlash {
          getAssetRoute(id) ~ updateAssetRoute(id) ~ deleteAssetRoute(id)
        } ~
        updateVerificationRoute(id)
      }
    }
}
