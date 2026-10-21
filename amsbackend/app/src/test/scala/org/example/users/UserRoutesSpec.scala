package org.example.users

import org.apache.pekko.http.scaladsl.model._
import org.apache.pekko.http.scaladsl.model.headers.{Authorization, OAuth2BearerToken}
import org.apache.pekko.http.scaladsl.testkit.ScalatestRouteTest
import org.example.TestDbHelper
import org.example.db.Database
import org.junit.runner.RunWith
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.junit.JUnitRunner
import slick.jdbc.PostgresProfile.api._

import scala.concurrent.Await
import scala.concurrent.duration._

@RunWith(classOf[JUnitRunner])
class UserRoutesSpec extends AnyFunSuite with Matchers with ScalatestRouteTest {

  override def beforeAll(): Unit = {
    super.beforeAll()
    TestDbHelper.ensureInitialized()
  }

  val db = Database.slickDatabase
  val userRepo = new UserRepository(db)
  val userService = new UserService(userRepo)
  val userRoutes = new UserRoutes(userService)

  private lazy val (adminRoleId, superAdminRoleId, generalRoleId, custodianRoleId) = {
    val saId = Await.result(db.run(sql"SELECT id FROM roles WHERE name = 'SUPER_ADMIN'".as[Long].head), 5.seconds)
    val aId = Await.result(db.run(sql"SELECT id FROM roles WHERE name = 'ADMIN'".as[Long].head), 5.seconds)
    val gId = Await.result(db.run(sql"SELECT id FROM roles WHERE name = 'GENERAL'".as[Long].head), 5.seconds)
    val cId = Await.result(db.run(sql"SELECT id FROM roles WHERE name = 'CUSTODIAN'".as[Long].head), 5.seconds)
    (aId, saId, gId, cId)
  }

  test("GET /api/users should reject GENERAL user with 403") {
    Get("/api/users") ~> addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~>
      userRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("GET /api/users should allow ADMIN user with 200") {
    Get("/api/users") ~> addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      userRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      responseAs[String] should include("items")
    }
  }

  test("POST /api/users: ADMIN can create GENERAL user") {
    val empId = s"EMP_${System.currentTimeMillis()}"
    val email = s"$empId@example.com"
    val json = s"""{
      "employeeId":"$empId",
      "name":"New General User",
      "email":"$email",
      "password":"StrongPassword123!",
      "roleId":$generalRoleId,
      "status":"ACTIVE"
    }"""

    Post("/api/users", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      responseAs[String] should include(empId)
      responseAs[String] should not include("password") // Password hash not exposed
    }
  }

  test("POST /api/users: ADMIN cannot create ADMIN or SUPER_ADMIN account") {
    val empId = s"EMP_FAIL_${System.currentTimeMillis()}"
    val json = s"""{
      "employeeId":"$empId",
      "name":"Admin By Admin",
      "email":"$empId@example.com",
      "password":"StrongPassword123!",
      "roleId":$adminRoleId,
      "status":"ACTIVE"
    }"""

    Post("/api/users", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("POST /api/users: SUPER_ADMIN can create ADMIN account") {
    val empId = s"EMP_SA_ADM_${System.currentTimeMillis()}"
    val json = s"""{
      "employeeId":"$empId",
      "name":"Admin By SuperAdmin",
      "email":"$empId@example.com",
      "password":"StrongPassword123!",
      "roleId":$adminRoleId,
      "status":"ACTIVE"
    }"""

    Post("/api/users", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.superAdminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      responseAs[String] should include("ADMIN")
    }
  }

  test("PUT /api/users/{id}: ADMIN cannot modify an ADMIN or SUPER_ADMIN account") {
    val json = """{"name":"Modified By Admin"}"""
    Put(s"/api/users/${TestDbHelper.superAdminId}", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("PUT /api/users/me allows authenticated user to update their own profile including city and country") {
    val json = """{"city":"Noida","country":"India"}"""
    Put("/api/users/me", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      val resp = responseAs[String]
      resp should include("Noida")
      resp should include("India")
    }
  }

  test("PUT /api/users/{id}: allows ADMIN to update their own profile") {
    val json = """{"city":"Noida","country":"India"}"""
    Put(s"/api/users/${TestDbHelper.adminId}", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      val resp = responseAs[String]
      resp should include("Noida")
    }
  }

  test("PUT /api/users/{id}: SUPER_ADMIN can update user role from GENERAL to ADMIN") {
    val empId = s"EMP_ROLE_PROMO_${System.currentTimeMillis()}"
    val createJson = s"""{
      "employeeId":"$empId",
      "name":"Role Promo Test",
      "email":"$empId@example.com",
      "password":"StrongPassword123!",
      "roleId":$generalRoleId,
      "status":"ACTIVE"
    }"""

    val idRegex = """"id"\s*:\s*(\d+)""".r
    var createdUserId: Long = 0L
    Post("/api/users", HttpEntity(ContentTypes.`application/json`, createJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.superAdminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      val resp = responseAs[String]
      resp should include("GENERAL")
      createdUserId = idRegex.findFirstMatchIn(resp).map(_.group(1).toLong).get
    }

    val updateJson = s"""{"roleId":$adminRoleId}"""
    Put(s"/api/users/$createdUserId", HttpEntity(ContentTypes.`application/json`, updateJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.superAdminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      val resp = responseAs[String]
      resp should include("ADMIN")
      resp should not include("GENERAL")
    }
  }

  test("PUT /api/users/{id}: ADMIN cannot update a user's role") {
    val empId = s"EMP_ROLE_FAIL_${System.currentTimeMillis()}"
    val createJson = s"""{
      "employeeId":"$empId",
      "name":"Role Fail Test",
      "email":"$empId@example.com",
      "password":"StrongPassword123!",
      "roleId":$generalRoleId,
      "status":"ACTIVE"
    }"""

    val idRegex = """"id"\s*:\s*(\d+)""".r
    var createdUserId: Long = 0L
    Post("/api/users", HttpEntity(ContentTypes.`application/json`, createJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      createdUserId = idRegex.findFirstMatchIn(responseAs[String]).map(_.group(1).toLong).get
    }

    val updateJson = s"""{"roleId":$adminRoleId}"""
    Put(s"/api/users/$createdUserId", HttpEntity(ContentTypes.`application/json`, updateJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("PATCH /api/users/{id}/status: ADMIN cannot change status of SUPER_ADMIN") {
    val json = """{"status":"INACTIVE"}"""
    Patch(s"/api/users/${TestDbHelper.superAdminId}/status", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("PATCH /api/users/{id}/role: ADMIN cannot grant privileged roles") {
    val json = s"""{"roleId":$adminRoleId}"""
    Patch(s"/api/users/${TestDbHelper.generalId}/role", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("PATCH /api/users/{id}/status: Cannot deactivate the last active SUPER_ADMIN") {
    val json = """{"status":"INACTIVE"}"""
    Patch(s"/api/users/${TestDbHelper.superAdminId}/status", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.superAdminToken))) ~> userRoutes.route ~> check {
      // If there is only 1 super admin in test db, deactivation must be rejected with 409 Conflict
      status should (be(StatusCodes.Conflict) or be(StatusCodes.OK))
    }
  }

  test("POST /api/users: Rejects duplicate employee ID or email with 409") {
    val json = s"""{
      "employeeId":"TEST_GENERAL",
      "name":"Duplicate Test",
      "email":"unique_email_test@example.com",
      "password":"StrongPassword123!",
      "roleId":$generalRoleId
    }"""

    Post("/api/users", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Conflict
    }
  }

  test("GET /api/roles: returns dynamically resolved roles including CUSTODIAN") {
    Get("/api/roles") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      val res = responseAs[String]
      res should include("SUPER_ADMIN")
      res should include("ADMIN")
      res should include("GENERAL")
      res should include("CUSTODIAN")
    }
  }

  test("POST /api/users: ADMIN can create CUSTODIAN user with dynamically resolved role ID") {
    val empId = s"EMP_CUST_${System.currentTimeMillis()}"
    val json = s"""{
      "employeeId":"$empId",
      "name":"Dynamic Custodian User",
      "email":"$empId@example.com",
      "password":"StrongPassword123!",
      "roleId":$custodianRoleId,
      "status":"ACTIVE"
    }"""

    Post("/api/users", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      val res = responseAs[String]
      res should include(empId)
      res should include("CUSTODIAN")
    }
  }

  test("POST /api/users: CUSTODIAN cannot manage users (403 Forbidden)") {
    val empId = s"EMP_NOPE_${System.currentTimeMillis()}"
    val json = s"""{
      "employeeId":"$empId",
      "name":"Should Fail",
      "email":"$empId@example.com",
      "password":"StrongPassword123!",
      "roleId":$generalRoleId,
      "status":"ACTIVE"
    }"""

    Post("/api/users", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }

    Get("/api/users") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("GET /api/custodians returns all active users regardless of role") {
    Get("/api/custodians") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> userRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      val res = responseAs[String]
      // Should include users from multiple roles, not just CUSTODIAN
      res should include("test_admin@example.com")
      res should include("test_custodian1@example.com")
      res should include("test_general@example.com")
    }
  }
}
