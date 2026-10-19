package org.example.auth

import org.apache.pekko.http.scaladsl.model._
import org.apache.pekko.http.scaladsl.model.headers.{Authorization, OAuth2BearerToken}
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.testkit.ScalatestRouteTest
import org.example.TestDbHelper
import org.junit.runner.RunWith
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.junit.JUnitRunner

@RunWith(classOf[JUnitRunner])
class AuthRoutesSpec extends AnyFunSuite with Matchers with ScalatestRouteTest {

  override def beforeAll(): Unit = {
    super.beforeAll()
    TestDbHelper.ensureInitialized()
  }

  test("POST /api/auth/login should return JWT token with valid employee ID") {
    val json = """{"employeeIdOrEmail":"TEST_ADMIN","password":"TestPassword123!"}"""
    Post("/api/auth/login", HttpEntity(ContentTypes.`application/json`, json)) ~> AuthRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      val body = responseAs[String]
      body should include("accessToken")
      body should include("Bearer")
      body should include("3600")
      body should include("user")
      body should include("TEST_ADMIN")
      body should include("ADMIN")
      body should not include("password")
      body should not include("passwordHash")
    }
  }

  test("POST /api/auth/login should return JWT token with valid email case-insensitively") {
    val json = """{"employeeIdOrEmail":"TEST_ADMIN@EXAMPLE.COM","password":"TestPassword123!"}"""
    Post("/api/auth/login", HttpEntity(ContentTypes.`application/json`, json)) ~> AuthRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      val body = responseAs[String]
      body should include("accessToken")
      body should include("user")
      body should include("test_admin@example.com")
    }
  }

  test("POST /api/auth/login should reject incorrect password with 401") {
    val json = """{"employeeIdOrEmail":"TEST_ADMIN","password":"WrongPassword"}"""
    Post("/api/auth/login", HttpEntity(ContentTypes.`application/json`, json)) ~> AuthRoutes.route ~> check {
      status shouldBe StatusCodes.Unauthorized
      responseAs[String] should include("error")
    }
  }

  test("POST /api/auth/login should reject non-existent employee ID with 401") {
    val json = """{"employeeIdOrEmail":"NON_EXISTENT_EMP","password":"TestPassword123!"}"""
    Post("/api/auth/login", HttpEntity(ContentTypes.`application/json`, json)) ~> AuthRoutes.route ~> check {
      status shouldBe StatusCodes.Unauthorized
      responseAs[String] should include("error")
    }
  }

  test("POST /api/auth/login should reject inactive account with 401") {
    val json = """{"employeeIdOrEmail":"TEST_INACTIVE","password":"TestPassword123!"}"""
    Post("/api/auth/login", HttpEntity(ContentTypes.`application/json`, json)) ~> AuthRoutes.route ~> check {
      status shouldBe StatusCodes.Unauthorized
      responseAs[String] should include("error")
    }
  }

  test("POST /api/auth/login should reject missing fields with 400") {
    val json = """{"employeeIdOrEmail":"TEST_ADMIN"}"""
    Post("/api/auth/login", HttpEntity(ContentTypes.`application/json`, json)) ~> AuthRoutes.route ~> check {
      status shouldBe StatusCodes.BadRequest
    }
  }

  test("POST /api/auth/login should reject malformed JSON with 400") {
    val json = "not a valid json"
    Post("/api/auth/login", HttpEntity(ContentTypes.`application/json`, json)) ~> AuthRoutes.route ~> check {
      status shouldBe StatusCodes.BadRequest
    }
  }

  test("AuthDirectives should reject requests without Authorization header with 401") {
    val testRoute = AuthDirectives.authenticated { _ =>
      complete("OK")
    }

    Get("/test") ~> testRoute ~> check {
      status shouldBe StatusCodes.Unauthorized
      responseAs[String] should include("Bearer token required")
    }
  }

  test("AuthDirectives should reject invalid Bearer tokens with 401") {
    val testRoute = AuthDirectives.authenticated { _ =>
      complete("OK")
    }

    Get("/test") ~> addHeader(Authorization(OAuth2BearerToken("invalid.token"))) ~> testRoute ~> check {
      status shouldBe StatusCodes.Unauthorized
      responseAs[String] should include("Invalid or expired token")
    }
  }

  test("AuthDirectives should reject token belonging to inactive account with 401") {
    val testRoute = AuthDirectives.authenticated { _ =>
      complete("OK")
    }

    val inactiveToken = TestDbHelper.inactiveToken
    Get("/test") ~> addHeader(Authorization(OAuth2BearerToken(inactiveToken))) ~> testRoute ~> check {
      status shouldBe StatusCodes.Unauthorized
      responseAs[String] should include("Account is inactive")
    }
  }

  test("AuthDirectives should allow valid active Bearer token") {
    val testRoute = AuthDirectives.authenticated { claims =>
      complete(s"User:${claims.getSubject}")
    }

    val token = TestDbHelper.adminToken
    Get("/test") ~> addHeader(Authorization(OAuth2BearerToken(token))) ~> testRoute ~> check {
      status shouldBe StatusCodes.OK
      responseAs[String] shouldBe s"User:${TestDbHelper.adminId}"
    }
  }
}
