error id: file:///C:/Users/SrivasAm/Downloads/AMS/app/src/main/scala/org/example/assets/AssetRoutes.scala:
file:///C:/Users/SrivasAm/Downloads/AMS/app/src/main/scala/org/example/assets/AssetRoutes.scala
empty definition using pc, found symbol in pc: 
empty definition using semanticdb
empty definition using fallback
non-local guesses:
	 -org/apache/pekko/http/scaladsl/server/Directives.system.
	 -system.
	 -scala/Predef.system.
offset: 1462
uri: file:///C:/Users/SrivasAm/Downloads/AMS/app/src/main/scala/org/example/assets/AssetRoutes.scala
text:
```scala
package org.example.assets

import org.apache.pekko.http.scaladsl.model.StatusCodes
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.scala.DefaultScalaModule

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}

import org.slf4j.LoggerFactory

final class AssetRoutes(service: AssetService)(
    implicit executionContext: ExecutionContext
) {

  private val logger = LoggerFactory.getLogger(getClass)
  private val mapper = new ObjectMapper()
    .registerModule(DefaultScalaModule)

  private def json(value: Any): String =
    mapper.writeValueAsString(value)

  val route: Route =
    pathPrefix("api" / "assets") {
      pathEndOrSingleSlash {
        get {
          parameters(
            "page".as[Int].?(1),
            "pageSize".as[Int].?(20),
            "search".?
          ) { (page, pageSize, search) =>
            if (page < 1 || pageSize < 1 || pageSize > 100) {
              complete(
                StatusCodes.BadRequest,
                """{"error":"page must be >= 1 and pageSize must be between 1 and 100"}"""
              )
            } else {
              onComplete(service.getAssets(page, pageSize, search)) {
                case Success(result) =>
                  complete(json(result))

                case Failure(exception) =>
                  @@system.log.error("Failed to retrieve assets", exception)
                  complete(
                    StatusCodes.InternalServerError,
                    """{"error":"Failed to retrieve assets"}"""
                  )
              }
            }
          }
        }
      } ~
      path(LongNumber) { id =>
        get {
          onComplete(service.getAsset(id)) {
            case Success(Some(asset)) =>
              complete(json(asset))

            case Success(None) =>
              complete(
                StatusCodes.NotFound,
                """{"error":"Asset not found"}"""
              )

            case Failure(exception) =>
              system.log.error("Failed to retrieve asset", exception)
              complete(
                StatusCodes.InternalServerError,
                """{"error":"Failed to retrieve asset"}"""
              )
          }
        }
      }
    }
}
```


#### Short summary: 

empty definition using pc, found symbol in pc: 