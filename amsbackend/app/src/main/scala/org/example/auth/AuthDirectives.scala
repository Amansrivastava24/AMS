package org.example.auth

import io.jsonwebtoken.{Claims, Jwts}
import org.apache.pekko.http.scaladsl.model._
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route
import org.example.db.Database
import slick.jdbc.PostgresProfile.api._

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Success, Try}

object AuthDirectives {

  private implicit val ec: ExecutionContext = ExecutionContext.global

  private def errorResponse(
      status: StatusCode,
      message: String
  ): HttpResponse = {
    HttpResponse(
      status = status,
      entity = HttpEntity(
        ContentTypes.`application/json`,
        s"""{"error":"$message"}"""
      )
    )
  }

  def checkUserStatus(userId: Long): Future[Option[(String, String)]] = {
    val q = sql"""
      SELECT u.status, r.name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = $userId
      LIMIT 1
    """.as[(String, String)].headOption

    Database.slickDatabase.run(q)
  }

  def authenticated(inner: Claims => Route): Route = {
    extractRequest { request =>
      val authorization = request.headers
        .find(_.name.equalsIgnoreCase("authorization"))
        .map(_.value())

      authorization match {
        case Some(value) if value.startsWith("Bearer ") =>
          val token = value.stripPrefix("Bearer ").trim

          JwtService.validateToken(token) match {
            case Some(claims) =>
              val userIdOpt = Try(claims.getSubject.toLong).toOption
              userIdOpt match {
                case Some(userId) =>
                  onComplete(checkUserStatus(userId)) {
                    case Success(Some((status, currentRole))) =>
                      if (!status.equalsIgnoreCase("ACTIVE")) {
                        complete(
                          errorResponse(
                            StatusCodes.Unauthorized,
                            "Account is inactive"
                          )
                        )
                      } else {
                        val activeClaims = Jwts.claims()
                          .add(claims)
                          .add("role", currentRole)
                          .build()
                        inner(activeClaims)
                      }
                    case Success(None) =>
                      complete(
                        errorResponse(
                          StatusCodes.Unauthorized,
                          "User account not found or has been deactivated"
                        )
                      )
                    case Failure(_) =>
                      complete(
                        errorResponse(
                          StatusCodes.ServiceUnavailable,
                          "Authentication service unavailable"
                        )
                      )
                  }
                case None =>
                  complete(
                    errorResponse(
                      StatusCodes.Unauthorized,
                      "Invalid token subject"
                    )
                  )
              }

            case None =>
              complete(
                errorResponse(
                  StatusCodes.Unauthorized,
                  "Invalid or expired token"
                )
              )
          }

        case _ =>
          complete(
            errorResponse(
              StatusCodes.Unauthorized,
              "Bearer token required"
            )
          )
      }
    }
  }

  def hasRole(
      claims: Claims,
      allowedRoles: Set[String]
  ): Boolean = {
    Option(claims.get("role", classOf[String]))
      .exists(role => allowedRoles.contains(role))
  }

  def forbidden: Route =
    complete(
      errorResponse(
        StatusCodes.Forbidden,
        "Insufficient permissions"
      )
    )
}
