package org.example.locations

import org.apache.pekko.http.scaladsl.model._
import org.apache.pekko.http.scaladsl.model.headers.{Authorization, OAuth2BearerToken}
import org.apache.pekko.http.scaladsl.testkit.ScalatestRouteTest
import org.example.TestDbHelper
import org.example.common.JsonSupport
import org.example.db.Database
import org.example.users.UserRepository
import org.junit.runner.RunWith
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.junit.JUnitRunner

import scala.concurrent.Await
import scala.concurrent.duration._

@RunWith(classOf[JUnitRunner])
class LocationRoutesSpec extends AnyFunSuite with Matchers with ScalatestRouteTest {

  override def beforeAll(): Unit = {
    super.beforeAll()
    TestDbHelper.ensureInitialized()
  }

  val db = Database.slickDatabase
  val userRepo = new UserRepository(db)
  val locRepo = new LocationRepository(db)
  val locService = new LocationService(locRepo)
  val locRoutes = new LocationRoutes(locService, userRepo)

  test("GET /api/locations should return list of locations for authenticated user") {
    Get("/api/locations") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~>
      locRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      val resp = responseAs[String]
      resp should include("description")
      resp should include("city")
      resp should include("country")
    }
  }

  test("GET /api/locations should reject unauthenticated request with 401") {
    Get("/api/locations") ~> locRoutes.route ~> check {
      status shouldBe StatusCodes.Unauthorized
    }
  }

  test("GET /api/locations with search parameter should filter by description or seat") {
    // Seed a distinctive location
    val uniqueDesc = s"Distinctive_Lab_${System.currentTimeMillis()}"
    val createJson = s"""{"description":"$uniqueDesc","seatNo":"B-99","floorNo":"3"}"""

    Post("/api/locations", HttpEntity(ContentTypes.`application/json`, createJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      locRoutes.route ~> check {
      status shouldBe StatusCodes.Created
    }

    Get(s"/api/locations?search=$uniqueDesc") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      locRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      val resp = responseAs[String]
      resp should include(uniqueDesc)
      resp should include("B-99")
    }
  }

  test("POST /api/locations: ADMIN can create location inheriting city and country from profile") {
    val desc = s"Engineering_Floor_${System.currentTimeMillis()}"
    val json = s"""{
      "description":"$desc",
      "seatNo":"SEAT-401",
      "floorNo":"4"
    }"""

    Post("/api/locations", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      locRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      val resp = responseAs[String]
      resp should include(desc)
      resp should include("SEAT-401")
      resp should include("4")
      // Inherited from admin profile
      resp should include("Noida")
      resp should include("India")
    }
  }

  test("POST /api/locations: SUPER_ADMIN can create location") {
    val desc = s"Executive_Suite_${System.currentTimeMillis()}"
    val json = s"""{
      "description":"$desc",
      "floorNo":"6"
    }"""

    Post("/api/locations", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.superAdminToken))) ~>
      locRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      responseAs[String] should include(desc)
    }
  }

  test("POST /api/locations: Rejects GENERAL user with 403 Forbidden") {
    val json = """{"description":"Unauthorized Location"}"""
    Post("/api/locations", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~>
      locRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("POST /api/locations: Rejects CUSTODIAN user with 403 Forbidden") {
    val json = """{"description":"Custodian Unauthorized Location"}"""
    Post("/api/locations", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~>
      locRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("POST /api/locations: Rejects missing or empty description with 400 Bad Request") {
    val json = """{"description":"   ","floorNo":"1"}"""
    Post("/api/locations", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      locRoutes.route ~> check {
      status shouldBe StatusCodes.BadRequest
      responseAs[String] should include("Location description must not be empty")
    }
  }

  test("POST /api/locations: Rejects malformed JSON with 400 Bad Request") {
    Post("/api/locations", HttpEntity(ContentTypes.`application/json`, "invalid-json")) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      locRoutes.route ~> check {
      status shouldBe StatusCodes.BadRequest
    }
  }

  test("Location model JSON serialization: preserves all 6 target columns") {
    val loc = Location(
      id = 101L,
      description = "Server Room Alpha",
      seatNo = Some("SR-01"),
      floorNo = Some("Basement-1"),
      city = Some("Noida"),
      country = Some("India")
    )
    loc.id shouldBe 101L
    loc.description shouldBe "Server Room Alpha"
    loc.seatNo shouldBe Some("SR-01")
    loc.floorNo shouldBe Some("Basement-1")
    loc.city shouldBe Some("Noida")
    loc.country shouldBe Some("India")

    val json = JsonSupport.toJson(loc)
    json should include("Server Room Alpha")
    json should include("SR-01")
    json should include("Basement-1")
    json should include("Noida")
    json should include("India")
  }
}
