
package org.example.db

import org.flywaydb.core.Flyway

object DatabaseMigration {

  def migrate(): Unit = {
    val config = com.typesafe.config.ConfigFactory
      .load()
      .getConfig("database")

    val flyway = Flyway.configure()
      .dataSource(
        config.getString("url"),
        config.getString("user"),
        config.getString("password")
      )
      .locations("classpath:db/migration")
      .load()

    val result = flyway.migrate()

    println(
      s"Flyway migration completed. Migrations applied: ${result.migrationsExecuted}"
    )
  }
}
