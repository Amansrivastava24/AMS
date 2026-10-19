package org.example.auth

import org.apache.pekko.http.scaladsl.model._
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route
import org.example.common.JsonSupport

import scala.concurrent.ExecutionContext

object AuthRoutes {

  private implicit val ec: ExecutionContext = ExecutionContext.global

  val route: Route =
    path("api" / "auth" / "login") {
      post {
        entity(as[String]) { body =>
          try {
            val json = JsonSupport.mapper.readTree(body)

            val identifierNode = json.get("employeeIdOrEmail")
            val passwordNode = json.get("password")

            if (
              identifierNode == null ||
              passwordNode == null ||
              !identifierNode.isTextual ||
              !passwordNode.isTextual ||
              identifierNode.asText().trim.isEmpty ||
              passwordNode.asText().isEmpty
            ) {
              complete(
                JsonSupport.jsonResponse(
                  StatusCodes.BadRequest,
                  Map("error" -> "Employee ID/email and password are required")
                )
              )
            } else {
              val request = LoginRequest(
                employeeIdOrEmail = identifierNode.asText(),
                password = passwordNode.asText()
              )

              onSuccess(AuthService.login(request)) {
                case Right(loginResponse) =>
                  complete(
                    JsonSupport.jsonResponse(
                      StatusCodes.OK,
                      loginResponse
                    )
                  )

                case Left("Invalid credentials") |
                     Left("Account is inactive") =>
                  complete(
                    JsonSupport.jsonResponse(
                      StatusCodes.Unauthorized,
                      Map("error" -> "Invalid credentials or inactive account")
                    )
                  )

                case Left(_) =>
                  complete(
                    JsonSupport.jsonResponse(
                      StatusCodes.ServiceUnavailable,
                      Map("error" -> "Authentication service unavailable")
                    )
                  )
              }
            }
          } catch {
            case _: Exception =>
              complete(
                JsonSupport.jsonResponse(
                  StatusCodes.BadRequest,
                  Map("error" -> "Invalid JSON request")
                )
              )
          }
        }
      }
    }
}
