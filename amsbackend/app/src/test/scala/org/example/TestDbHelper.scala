package org.example

import org.example.auth.{JwtService, PasswordService}
import org.example.db.{Database, DatabaseMigration}
import slick.jdbc.PostgresProfile.api._

import scala.concurrent.Await
import scala.concurrent.duration._

object TestDbHelper {

  private var initialized = false

  def ensureInitialized(): Unit = synchronized {
    if (!initialized) {
      DatabaseMigration.migrate()
      val db = Database.slickDatabase

      // Ensure reference roles exist
      Await.result(
        db.run(sqlu"""
          INSERT INTO roles (name)
          VALUES ('SUPER_ADMIN'), ('ADMIN'), ('GENERAL'), ('CUSTODIAN')
          ON CONFLICT (name) DO NOTHING
        """),
        5.seconds
      )

      // Ensure test roles exist and get IDs
      val superAdminRoleId = Await.result(
        db.run(sql"SELECT id FROM roles WHERE name = 'SUPER_ADMIN'".as[Long].head),
        5.seconds
      )
      val adminRoleId = Await.result(
        db.run(sql"SELECT id FROM roles WHERE name = 'ADMIN'".as[Long].head),
        5.seconds
      )
      val generalRoleId = Await.result(
        db.run(sql"SELECT id FROM roles WHERE name = 'GENERAL'".as[Long].head),
        5.seconds
      )
      val custodianRoleId = Await.result(
        db.run(sql"SELECT id FROM roles WHERE name = 'CUSTODIAN'".as[Long].head),
        5.seconds
      )

      val passwordHash = PasswordService.hashPassword("TestPassword123!")

      def getOrInsertUser(empId: String, name: String, email: String, roleId: Long, status: String): Long = {
        val existingIdOpt = Await.result(
          db.run(sql"SELECT id FROM users WHERE employee_id = $empId OR email = $email LIMIT 1".as[Long].headOption),
          5.seconds
        )
        existingIdOpt match {
          case Some(id) =>
            Await.result(
              db.run(sqlu"UPDATE users SET employee_id = $empId, name = $name, email = $email, password_hash = $passwordHash, role_id = $roleId, status = $status WHERE id = $id"),
              5.seconds
            )
            id
          case None =>
            Await.result(
              db.run(sql"""
                INSERT INTO users (employee_id, name, email, password_hash, role_id, status)
                VALUES ($empId, $name, $email, $passwordHash, $roleId, $status)
                RETURNING id
              """.as[Long].head),
              5.seconds
            )
        }
      }

      superAdminId = getOrInsertUser("TEST_SUPER_ADMIN", "Test Super Admin", "test_superadmin@example.com", superAdminRoleId, "ACTIVE")
      adminId = getOrInsertUser("TEST_ADMIN", "Test Admin", "test_admin@example.com", adminRoleId, "ACTIVE")
      generalId = getOrInsertUser("TEST_GENERAL", "Test General", "test_general@example.com", generalRoleId, "ACTIVE")
      custodianId = getOrInsertUser("TEST_CUSTODIAN", "Test Custodian 1", "test_custodian1@example.com", custodianRoleId, "ACTIVE")
      custodian2Id = getOrInsertUser("TEST_CUSTODIAN2", "Test Custodian 2", "test_custodian2@example.com", custodianRoleId, "ACTIVE")
      inactiveId = getOrInsertUser("TEST_INACTIVE", "Test Inactive", "test_inactive@example.com", generalRoleId, "INACTIVE")

      initialized = true
    }
  }

  var superAdminId: Long = 0L
  var adminId: Long = 0L
  var generalId: Long = 0L
  var custodianId: Long = 0L
  var custodian2Id: Long = 0L
  var inactiveId: Long = 0L

  def superAdminToken: String = {
    ensureInitialized()
    JwtService.generateToken(superAdminId, "test_superadmin@example.com", "SUPER_ADMIN")
  }

  def adminToken: String = {
    ensureInitialized()
    JwtService.generateToken(adminId, "test_admin@example.com", "ADMIN")
  }

  def generalToken: String = {
    ensureInitialized()
    JwtService.generateToken(generalId, "test_general@example.com", "GENERAL")
  }

  def custodianToken: String = {
    ensureInitialized()
    JwtService.generateToken(custodianId, "test_custodian1@example.com", "CUSTODIAN")
  }

  def custodian2Token: String = {
    ensureInitialized()
    JwtService.generateToken(custodian2Id, "test_custodian2@example.com", "CUSTODIAN")
  }

  def inactiveToken: String = {
    ensureInitialized()
    JwtService.generateToken(inactiveId, "test_inactive@example.com", "GENERAL")
  }
}
