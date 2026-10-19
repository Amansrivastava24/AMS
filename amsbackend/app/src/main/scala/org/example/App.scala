package org.example

import com.typesafe.config.ConfigFactory
import org.apache.pekko.actor.typed.ActorSystem
import org.apache.pekko.actor.typed.scaladsl.Behaviors
import org.apache.pekko.http.scaladsl.Http
import org.apache.pekko.http.scaladsl.model.StatusCodes
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route
import org.example.assets.{AssetRepository, AssetRoutes, AssetService}
import org.example.assettypes.{AssetTypeRepository, AssetTypeRoutes, AssetTypeService}
import org.example.auth.AuthRoutes
import org.example.common.JsonSupport
import org.example.db.{Database, DatabaseMigration}
import org.example.departments.{DepartmentRepository, DepartmentRoutes, DepartmentService}
import org.example.locations.{LocationRepository, LocationRoutes, LocationService}
import org.example.users.{UserRepository, UserRoutes, UserService}

import scala.util.{Failure, Success}

object App {

  def buildRoute(
      assetRoutes: AssetRoutes,
      userRoutes: UserRoutes,
      departmentRoutes: DepartmentRoutes,
      assetTypeRoutes: AssetTypeRoutes,
      locationRoutes: LocationRoutes
  ): Route = {
    path("health") {
      get {
        complete(JsonSupport.jsonResponse(StatusCodes.OK, Map("status" -> "UP", "service" -> "asset-management-system")))
      }
    } ~
    path("health" / "db") {
      get {
        try {
          val databaseName = Database.checkConnection()
          complete(
            JsonSupport.jsonResponse(StatusCodes.OK, Map("status" -> "UP", "database" -> databaseName))
          )
        } catch {
          case exception: Exception =>
            complete(
              JsonSupport.simpleError(StatusCodes.ServiceUnavailable, "Database connection failed")
            )
        }
      }
    } ~
    AuthRoutes.route ~
    userRoutes.route ~
    departmentRoutes.route ~
    assetTypeRoutes.route ~
    locationRoutes.route ~
    assetRoutes.route
  }

  def main(args: Array[String]): Unit = {
    val config = ConfigFactory.load()

    DatabaseMigration.migrate()

    implicit val system: ActorSystem[Nothing] =
      ActorSystem(Behaviors.empty, "asset-management-system")

    implicit val executionContext = system.executionContext

    val db = Database.slickDatabase

    val departmentRepository = new DepartmentRepository(db)
    val departmentService = new DepartmentService(departmentRepository)
    val departmentRoutes = new DepartmentRoutes(departmentService)

    val assetTypeRepository = new AssetTypeRepository(db)
    val assetTypeService = new AssetTypeService(assetTypeRepository)
    val assetTypeRoutes = new AssetTypeRoutes(assetTypeService)

    val locationRepository = new LocationRepository(db)
    val locationService = new LocationService(locationRepository)
    val locationRoutes = new LocationRoutes(locationService)

    val userRepository = new UserRepository(db)
    val userService = new UserService(userRepository)
    val userRoutes = new UserRoutes(userService)

    val assetRepository = new AssetRepository(db)
    val assetService = new AssetService(assetRepository)
    val assetRoutes = new AssetRoutes(assetService)

    val route = buildRoute(
      assetRoutes,
      userRoutes,
      departmentRoutes,
      assetTypeRoutes,
      locationRoutes
    )

    val serverHost = if (config.hasPath("server.host")) config.getString("server.host") else "127.0.0.1"
    val serverPort = if (config.hasPath("server.port")) config.getInt("server.port") else 8080

    Http()
      .newServerAt(serverHost, serverPort)
      .bind(route)
      .onComplete {
        case Success(binding) =>
          system.log.info(
            s"HTTP server started at http://${binding.localAddress.getHostString}:${binding.localAddress.getPort}"
          )

        case Failure(exception) =>
          system.log.error("Failed to start HTTP server", exception)
          system.terminate()
      }
  }
}