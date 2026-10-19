package org.example.db

import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.junit.JUnitRunner
import org.junit.runner.RunWith
import slick.jdbc.PostgresProfile.api._
import scala.concurrent.Await
import scala.concurrent.duration._

@RunWith(classOf[JUnitRunner])
class DbSmokeTest extends AnyFunSuite with Matchers {

  test("Database connection should be active") {
    val dbName = org.example.db.Database.checkConnection()
    dbName shouldBe "assetmanagement"
  }

  test("Check existing roles and users in database") {
    DatabaseMigration.migrate()
    val db = org.example.db.Database.slickDatabase
    try {
      Await.result(
        db.run(sqlu"""
          INSERT INTO roles (name)
          VALUES ('SUPER_ADMIN'), ('ADMIN'), ('GENERAL')
          ON CONFLICT (name) DO NOTHING
        """),
        5.seconds
      )
      val rolesQuery = sql"SELECT id, name FROM roles".as[(Long, String)]
      val roles = Await.result(db.run(rolesQuery), 5.seconds)
      println(s"Existing roles: $roles")
      roles.map(_._2).toSet should contain allOf ("SUPER_ADMIN", "ADMIN", "GENERAL")

      val usersQuery = sql"SELECT id, employee_id, email, status FROM users".as[(Long, String, String, String)]
      val users = Await.result(db.run(usersQuery), 5.seconds)
      println(s"Existing users count: ${users.size}, users: $users")
    } finally {
      // Don't close global Database here as other tests might use it
    }
  }
}
