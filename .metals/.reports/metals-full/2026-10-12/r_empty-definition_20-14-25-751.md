error id: file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/App.scala:
file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/App.scala
empty definition using pc, found symbol in pc: 
empty definition using semanticdb
empty definition using fallback
non-local guesses:
	 -org/apache/pekko/http/scaladsl/server/Directives.binding.localAddress.getHostString.
	 -org/apache/pekko/http/scaladsl/server/Directives.binding.localAddress.getHostString#
	 -org/apache/pekko/http/scaladsl/server/Directives.binding.localAddress.getHostString().
	 -binding/localAddress/getHostString.
	 -binding/localAddress/getHostString#
	 -binding/localAddress/getHostString().
	 -scala/Predef.binding.localAddress.getHostString.
	 -scala/Predef.binding.localAddress.getHostString#
	 -scala/Predef.binding.localAddress.getHostString().
offset: 2181
uri: file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/App.scala
text:
```scala
package org.example

import org.apache.pekko.actor.typed.ActorSystem
import org.apache.pekko.actor.typed.scaladsl.Behaviors
import org.apache.pekko.http.scaladsl.Http
import org.apache.pekko.http.scaladsl.server.Directives._
import org.example.db.Database
import org.apache.pekko.http.scaladsl.model.StatusCodes
import org.example.db.DatabaseMigration

import scala.util.{Failure, Success}

import org.example.assets.{AssetRepository, AssetRoutes, AssetService}

import org.example.assetitems.{ AssetItemRepository, AssetItemRoutes, AssetItemService }

object App {
  def main(args: Array[String]): Unit = {

    DatabaseMigration.migrate()
    implicit val system: ActorSystem[Nothing] =
      ActorSystem(Behaviors.empty, "asset-management-system")

    implicit val executionContext = system.executionContext

    val assetRepository = new AssetRepository(Database.slickDatabase)
    val assetService = new AssetService(assetRepository)
    val assetRoutes = new AssetRoutes(assetService)

    val assetItemRepository = new AssetItemRepository(Database.slickDatabase)

    val assetItemService = new AssetItemService(assetItemRepository)

    val assetItemRoutes = new AssetItemRoutes(assetItemService)

    val route =
      path("health") {
        get {
          complete("""{"status":"UP","service":"asset-management-system"}""")
        }
      } ~
      path("health" / "db") {
        get {
          try {
            val databaseName = Database.checkConnection()

            complete(
              s"""{"status":"UP","database":"$databaseName"}"""
            )
          } catch {
            case exception: Exception =>
              system.log.error("Database health check failed", exception)

              complete(
                StatusCodes.ServiceUnavailable,
                """{"status":"DOWN","error":"Database connection failed"}"""
              )
          }
        }
      } ~ assetRoutes.route ~ assetItemRoutes.route

    Http()
      .newServerAt("localhost", 8080)
      .bind(route)
      .onComplete {
        case Success(binding) =>
          system.log.info(
            s"HTTP server started at http://${binding.localAddress.getHostString@@}:${binding.localAddress.getPort}"
          )

        case Failure(exception) =>
          system.log.error("Failed to start HTTP server", exception)
          system.terminate()
      }
  }
}
```


#### Short summary: 

empty definition using pc, found symbol in pc: 