package org.example.db

import com.typesafe.config.ConfigFactory
import com.zaxxer.hikari.{HikariConfig, HikariDataSource}
import slick.jdbc.PostgresProfile.api._

object Database {

  private val config = ConfigFactory.load().getConfig("database")

  private val hikariConfig = new HikariConfig()



  hikariConfig.setJdbcUrl(config.getString("url"))
  hikariConfig.setUsername(config.getString("user"))
  hikariConfig.setPassword(config.getString("password"))
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