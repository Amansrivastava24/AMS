error id: file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/db/Database.scala:setPassword.
file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/db/Database.scala
empty definition using pc, found symbol in pc: setPassword.
empty definition using semanticdb
empty definition using fallback
non-local guesses:
	 -slick/jdbc/PostgresProfile.api.hikariConfig.setPassword.
	 -slick/jdbc/PostgresProfile.api.hikariConfig.setPassword#
	 -slick/jdbc/PostgresProfile.api.hikariConfig.setPassword().
	 -hikariConfig/setPassword.
	 -hikariConfig/setPassword#
	 -hikariConfig/setPassword().
	 -scala/Predef.hikariConfig.setPassword.
	 -scala/Predef.hikariConfig.setPassword#
	 -scala/Predef.hikariConfig.setPassword().
offset: 420
uri: file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/db/Database.scala
text:
```scala
package org.example.db

import com.typesafe.config.ConfigFactory
import com.zaxxer.hikari.{HikariConfig, HikariDataSource}
import slick.jdbc.PostgresProfile.api._

object Database {

  private val config = ConfigFactory.load().getConfig("database")

  private val hikariConfig = new HikariConfig()



  hikariConfig.setJdbcUrl(config.getString("url"))
  hikariConfig.setUsername(config.getString("user"))
  hikariConfig.@@setPassword(config.getString("password"))
  hikariConfig.setMaximumPoolSize(
    config.getInt("maximum-pool-size")
  )
  hikariConfig.setPoolName("asset-management-pool")

  private val dataSource = new HikariDataSource(hikariConfig)

  def slickDatabase: slick.jdbc.JdbcBackend.Database = slick.jdbc.JdbcBackend.Database.forDataSource(dataSource, None)

  def checkConnection(): String = {
    val connection = dataSource.getConnection

    try {
      val statement = connection.createStatement()

      try {
        val result = statement.executeQuery(
          "SELECT current_database()"
        )

        try {
          result.next()
          result.getString(1)
        } finally {
          result.close()
        }
      } finally {
        statement.close()
      }
    } finally {
      connection.close()
    }
  }

  def close(): Unit = dataSource.close()
}
```


#### Short summary: 

empty definition using pc, found symbol in pc: setPassword.