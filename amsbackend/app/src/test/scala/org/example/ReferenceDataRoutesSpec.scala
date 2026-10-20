package org.example

import org.apache.pekko.http.scaladsl.model._
import org.apache.pekko.http.scaladsl.model.headers.{Authorization, OAuth2BearerToken}
import org.apache.pekko.http.scaladsl.testkit.ScalatestRouteTest
import org.example.assettypes.{AssetTypeRepository, AssetTypeRoutes, AssetTypeService}
import org.example.db.Database
import org.example.departments.{DepartmentRepository, DepartmentRoutes, DepartmentService}
import org.example.locations.{LocationRepository, LocationRoutes, LocationService}
import org.junit.runner.RunWith
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.junit.JUnitRunner

@RunWith(classOf[JUnitRunner])
class ReferenceDataRoutesSpec extends AnyFunSuite with Matchers with ScalatestRouteTest {

  override def beforeAll(): Unit = {
    super.beforeAll()
    TestDbHelper.ensureInitialized()
  }

  val db = Database.slickDatabase

  val deptRepo = new DepartmentRepository(db)
  val deptService = new DepartmentService(deptRepo)
  val deptRoutes = new DepartmentRoutes(deptService)

  val typeRepo = new AssetTypeRepository(db)
  val typeService = new AssetTypeService(typeRepo)
  val typeRoutes = new AssetTypeRoutes(typeService)

  val locRepo = new LocationRepository(db)
  val locService = new LocationService(locRepo)
  val locRoutes = new LocationRoutes(locService)

  // ----------------- DEPARTMENTS -----------------
  test("GET /api/departments should return list for authenticated users") {
    Get("/api/departments") ~> addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~> deptRoutes.route ~> check {
      status shouldBe StatusCodes.OK
    }
  }

  test("POST /api/departments should reject GENERAL user with 403") {
    val json = """{"name":"Engineering"}"""
    Post("/api/departments", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~> deptRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("POST /api/departments should create department for ADMIN user") {
    val deptName = s"TestDept_${System.currentTimeMillis()}"
    val json = s"""{"name":"$deptName"}"""
    Post("/api/departments", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> deptRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      responseAs[String] should include(deptName)
    }
  }

  test("POST /api/departments should reject duplicate department with 409") {
    val deptName = s"UniqueDept_${System.currentTimeMillis()}"
    val json = s"""{"name":"$deptName"}"""

    // Create once
    Post("/api/departments", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> deptRoutes.route ~> check {
      status shouldBe StatusCodes.Created
    }

    // Create again with same name
    Post("/api/departments", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> deptRoutes.route ~> check {
      status shouldBe StatusCodes.Conflict
    }
  }

  // ----------------- ASSET TYPES -----------------
  test("GET /api/asset-types should return list for authenticated users") {
    Get("/api/asset-types") ~> addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~> typeRoutes.route ~> check {
      status shouldBe StatusCodes.OK
    }
  }

  test("POST /api/asset-types should reject GENERAL user with 403") {
    val json = """{"name":"Server"}"""
    Post("/api/asset-types", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~> typeRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("POST /api/asset-types should create asset type for ADMIN") {
    val typeName = s"TestType_${System.currentTimeMillis()}"
    val json = s"""{"name":"$typeName"}"""
    Post("/api/asset-types", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> typeRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      responseAs[String] should include(typeName)
    }
  }

  // ----------------- LOCATIONS -----------------
  test("GET /api/locations should return list for authenticated users") {
    Get("/api/locations") ~> addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~> locRoutes.route ~> check {
      status shouldBe StatusCodes.OK
    }
  }

  test("POST /api/locations should reject GENERAL user with 403") {
    val json = """{"description":"Building B","floorNo":"2nd"}"""
    Post("/api/locations", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~> locRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("POST /api/locations should create location for ADMIN") {
    val locName = s"TestLoc_${System.currentTimeMillis()}"
    val json = s"""{"description":"$locName","floorNo":"4th","seatNo":"Seat 101"}"""
    Post("/api/locations", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> locRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      responseAs[String] should include(locName)
    }
  }
}
