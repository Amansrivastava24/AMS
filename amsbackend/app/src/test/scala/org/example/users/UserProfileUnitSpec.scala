package org.example.users

import org.example.TestDbHelper
import org.example.common.JsonSupport
import org.example.db.Database
import org.junit.runner.RunWith
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.junit.JUnitRunner

import scala.concurrent.Await
import scala.concurrent.duration._

@RunWith(classOf[JUnitRunner])
class UserProfileUnitSpec extends AnyFunSuite with Matchers {

  TestDbHelper.ensureInitialized()

  implicit val ec: scala.concurrent.ExecutionContext = scala.concurrent.ExecutionContext.global

  val db = Database.slickDatabase
  val repository = new UserRepository(db)
  val service = new UserService(repository)

  test("UserResponse JSON serialization: includes city and country fields") {
    val userResp = UserResponse(
      id = 10L,
      employeeId = "EMP_10",
      name = "Alice Smith",
      email = "alice@example.com",
      role = "ADMIN",
      roleId = 2L,
      departmentId = Some(1L),
      departmentName = Some("R&D"),
      status = "ACTIVE",
      city = Some("Noida"),
      country = Some("India")
    )

    val json = JsonSupport.toJson(userResp)
    json should include(""""city":"Noida"""")
    json should include(""""country":"India"""")
    json should include(""""name":"Alice Smith"""")
  }

  test("UpdateUserRequest JSON deserialization: parses city, country, and department cleanly") {
    val json = """{
      "name":"Updated Name",
      "email":"updated.email@example.com",
      "city":"Bengaluru",
      "country":"India",
      "departmentId":3
    }"""

    val reqTry = JsonSupport.fromJson[UpdateUserRequest](json)
    reqTry.isSuccess shouldBe true
    val req = reqTry.get
    req.name shouldBe Some("Updated Name")
    req.email shouldBe Some("updated.email@example.com")
    req.city shouldBe Some("Bengaluru")
    req.country shouldBe Some("India")
    req.cleanDepartmentId shouldBe Some(Some(3L))
  }

  test("UserService.updateUser: ADMIN can modify their own profile including city and country") {
    val req = UpdateUserRequest(
      name = Some("Test Admin"),
      city = Some("Noida"),
      country = Some("India")
    )

    // callerId == targetId
    val result = Await.result(service.updateUser(TestDbHelper.adminId, "ADMIN", TestDbHelper.adminId, req), 5.seconds)
    result.isRight shouldBe true
    val updated = result.toOption.get
    updated.id shouldBe TestDbHelper.adminId
    updated.city shouldBe Some("Noida")
    updated.country shouldBe Some("India")
  }

  test("UserService.updateUser: ADMIN cannot modify another ADMIN account") {
    val req = UpdateUserRequest(name = Some("Hacked Admin"))

    // Create a secondary admin
    val empId = s"SEC_ADM_${System.currentTimeMillis()}"
    val createReq = CreateUserRequest(
      employeeId = empId,
      name = "Secondary Admin",
      email = s"$empId@example.com",
      password = "Password123!",
      roleId = 2L
    )
    val secondAdmin = Await.result(service.createUser("SUPER_ADMIN", createReq), 5.seconds).toOption.get

    // Admin tries to modify second admin (callerId != targetId)
    val result = Await.result(service.updateUser(TestDbHelper.adminId, "ADMIN", secondAdmin.id, req), 5.seconds)
    result.isLeft shouldBe true
    result.left.get.message should include("Admins cannot modify other Admin or Super Admin accounts")
  }

  test("UserService.updateUser: ADMIN cannot modify SUPER_ADMIN account") {
    val req = UpdateUserRequest(name = Some("Hacked SuperAdmin"))
    val result = Await.result(service.updateUser(TestDbHelper.adminId, "ADMIN", TestDbHelper.superAdminId, req), 5.seconds)
    result.isLeft shouldBe true
    result.left.get.message should include("Admins cannot modify other Admin or Super Admin accounts")
  }

  test("UserService.updateUser: Rejects empty name with ValidationError") {
    val req = UpdateUserRequest(name = Some("   "))
    val result = Await.result(service.updateUser(TestDbHelper.adminId, "ADMIN", TestDbHelper.adminId, req), 5.seconds)
    result.isLeft shouldBe true
    result.left.get.message should include("Name must not be empty")
  }

  test("UserService.updateUser: Rejects invalid email without '@'") {
    val req = UpdateUserRequest(email = Some("invalid-email-address"))
    val result = Await.result(service.updateUser(TestDbHelper.adminId, "ADMIN", TestDbHelper.adminId, req), 5.seconds)
    result.isLeft shouldBe true
    result.left.get.message should include("Valid email is required")
  }

  test("UserService.updateUser: Rejects short password with fewer than 6 characters") {
    val req = UpdateUserRequest(password = Some("123"))
    val result = Await.result(service.updateUser(TestDbHelper.adminId, "ADMIN", TestDbHelper.adminId, req), 5.seconds)
    result.isLeft shouldBe true
    result.left.get.message should include("Password must contain at least 6 characters")
  }

  test("UserRepository.updateDetails: Preserves existing city and country when None is passed") {
    // First ensure user has city/country
    val initial = Await.result(
      repository.updateDetails(TestDbHelper.adminId, None, None, None, None, Some(Some("InitialCity")), Some(Some("InitialCountry"))),
      5.seconds
    ).get
    initial.city shouldBe Some("InitialCity")
    initial.country shouldBe Some("InitialCountry")

    // Update only name, passing None for city and country
    val partial = Await.result(
      repository.updateDetails(TestDbHelper.adminId, Some("Test Admin"), None, None, None, None, None),
      5.seconds
    ).get
    partial.name shouldBe "Test Admin"
    partial.city shouldBe Some("InitialCity")
    partial.country shouldBe Some("InitialCountry")

    // Reset back to Noida / India
    Await.result(
      repository.updateDetails(TestDbHelper.adminId, None, None, None, None, Some(Some("Noida")), Some(Some("India"))),
      5.seconds
    )
  }
}
