error id: file:///C:/Users/SrivasAm/OneDrive%20-%20Landis+Gyr/Desktop/AMS/app/src/main/scala/org/example/App.scala:ContentTypes.
file:///C:/Users/SrivasAm/OneDrive%20-%20Landis+Gyr/Desktop/AMS/app/src/main/scala/org/example/App.scala
empty definition using pc, found symbol in pc: 
empty definition using semanticdb
empty definition using fallback
non-local guesses:
	 -org/apache/pekko/http/scaladsl/server/Directives.ContentTypes.
	 -org/apache/pekko/http/scaladsl/server/Directives.ContentTypes#
	 -org/apache/pekko/http/scaladsl/server/Directives.ContentTypes().
	 -org/apache/pekko/http/scaladsl/model/ContentTypes.
	 -org/apache/pekko/http/scaladsl/model/ContentTypes#
	 -org/apache/pekko/http/scaladsl/model/ContentTypes().
	 -ContentTypes.
	 -ContentTypes#
	 -ContentTypes().
	 -scala/Predef.ContentTypes.
	 -scala/Predef.ContentTypes#
	 -scala/Predef.ContentTypes().
offset: 269
uri: file:///C:/Users/SrivasAm/OneDrive%20-%20Landis+Gyr/Desktop/AMS/app/src/main/scala/org/example/App.scala
text:
```scala
package org.example

import org.apache.pekko.actor.typed.ActorSystem
import org.apache.pekko.actor.typed.scaladsl.Behaviors
import org.apache.pekko.http.scaladsl.Http
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.model.@@ContentTypes
import org.apache.pekko.http.scaladsl.model.HttpEntity

import scala.util.{Failure, Success}

object App {

  def main(args: Array[String]): Unit = {
    implicit val system: ActorSystem[Nothing] =
      ActorSystem(Behaviors.empty, "asset-management-system")

    implicit val executionContext = system.executionContext

    val route =
      path("health") {
        get {
          complete(
            HttpEntity(
              ContentTypes.`application/json`,
              """{"status":"UP","service":"asset-management-system"}"""
            )
          )
        }
      }

    Http()
      .newServerAt("localhost", 8080)
      .bind(route)
      .onComplete {
        case Success(binding) =>
          println(
            s"Server running at http://${binding.localAddress.getHostString}:${binding.localAddress.getPort}"
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