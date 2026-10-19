error id: file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/auth/AuthDirectives.scala:
file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/auth/AuthDirectives.scala
empty definition using pc, found symbol in pc: 
empty definition using semanticdb
empty definition using fallback
non-local guesses:
	 -org/apache/pekko/http/scaladsl/model/ContentTypes.`application/json`.
	 -org/apache/pekko/http/scaladsl/model/ContentTypes.`application/json`#
	 -org/apache/pekko/http/scaladsl/model/ContentTypes.`application/json`().
	 -org/apache/pekko/http/scaladsl/server/Directives.ContentTypes.`application/json`.
	 -org/apache/pekko/http/scaladsl/server/Directives.ContentTypes.`application/json`#
	 -org/apache/pekko/http/scaladsl/server/Directives.ContentTypes.`application/json`().
	 -ContentTypes.`application/json`.
	 -ContentTypes.`application/json`#
	 -ContentTypes.`application/json`().
	 -scala/Predef.ContentTypes.`application/json`.
	 -scala/Predef.ContentTypes.`application/json`#
	 -scala/Predef.ContentTypes.`application/json`().
offset: 438
uri: file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/auth/AuthDirectives.scala
text:
```scala

package org.example.auth

import io.jsonwebtoken.Claims
import org.apache.pekko.http.scaladsl.model._
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route

object AuthDirectives {

  private def errorResponse(
      status: StatusCode,
      message: String
  ): HttpResponse = {
    HttpResponse(
      status = status,
      entity = HttpEntity(
        ContentTypes.`application@@/json`,
        s"""{"error":"$message"}"""
      )
    )
  }

  def authenticated(inner: Claims => Route): Route = {
    extractRequest { request =>
      val authorization = request.headers
        .find(_.is("Authorization"))
        .map(_.value())

      authorization match {
        case Some(value) if value.startsWith("Bearer ") =>
          val token = value.stripPrefix("Bearer ").trim

          JwtService.validateToken(token) match {
            case Some(claims) =>
              inner(claims)

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

```


#### Short summary: 

empty definition using pc, found symbol in pc: 