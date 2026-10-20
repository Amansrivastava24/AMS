package org.example.assets

import org.apache.pekko.http.scaladsl.model._
import org.apache.pekko.http.scaladsl.model.headers.{Authorization, OAuth2BearerToken}
import org.apache.pekko.http.scaladsl.testkit.ScalatestRouteTest
import org.apache.pekko.http.scaladsl.testkit.RouteTestTimeout
import org.example.TestDbHelper
import org.example.assettypes.{AssetTypeRepository, AssetTypeService}
import org.example.db.Database
import org.junit.runner.RunWith
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.junit.JUnitRunner
import org.example.locations.{Location, LocationsTable}
import slick.jdbc.PostgresProfile.api._

import scala.concurrent.Await
import scala.concurrent.duration._

@RunWith(classOf[JUnitRunner])
class AssetRoutesSpec extends AnyFunSuite with Matchers with ScalatestRouteTest {

  implicit val defaultTimeout: RouteTestTimeout = RouteTestTimeout(10.seconds)

  override def beforeAll(): Unit = {
    super.beforeAll()
    TestDbHelper.ensureInitialized()
  }

  val db = Database.slickDatabase
  val assetRepo = new AssetRepository(db)
  val assetService = new AssetService(assetRepo)
  val assetRoutes = new AssetRoutes(assetService)

  val typeRepo = new AssetTypeRepository(db)
  val typeService = new AssetTypeService(typeRepo)

  private lazy val testAssetTypeId: Long = {
    val existing = Await.result(db.run(sql"SELECT id FROM asset_types LIMIT 1".as[Long].headOption), 5.seconds)
    existing.getOrElse {
      val res = Await.result(typeService.createAssetType("Laptops"), 5.seconds)
      res.toOption.get.id
    }
  }

  test("GET /api/assets should allow GENERAL user to list assets") {
    Get("/api/assets") ~> addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      responseAs[String] should include("items")
    }
  }

  test("GET /api/assets/export should allow GENERAL user to download Excel workbook") {
    Get("/api/assets/export") ~> addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      contentType.toString should include("spreadsheetml.sheet")
      headers.find(_.is("content-disposition")).map(_.value()) shouldBe defined
    }
  }

  test("POST /api/assets should reject GENERAL user with 403 Forbidden") {
    val json = s"""{
      "assetCode":"AST_GEN_TEST",
      "name":"Monitor",
      "assetTypeId":$testAssetTypeId,
      "quantity":1
    }"""

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }
  }

  test("POST /api/assets: ADMIN can create independent physical asset with individual fields") {
    val code = s"AST_${System.currentTimeMillis()}"
    val tag = s"TAG_${System.currentTimeMillis()}"
    val serial = s"SN_${System.currentTimeMillis()}"
    val json = s"""{
      "assetCode":"$code",
      "assetTag":"$tag",
      "serialNumber":"$serial",
      "name":"ThinkPad P16",
      "assetTypeId":$testAssetTypeId,
      "status":"AVAILABLE",
      "verificationStatus":"FOUND",
      "quantity":1,
      "actualFound":1,
      "costCenter":"CC-500",
      "taggingStatus":"T",
      "makeModel":"Lenovo ThinkPad",
      "gatePassNumber":"GP-1001",
      "remarks":"Individually tracked physical asset"
    }"""

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      val res = responseAs[String]
      res should include(code)
      res should include(tag)
      res should include(serial)
    }
  }

  test("POST /api/assets: Rejects duplicate assetTag with 409 Conflict") {
    val code1 = s"AST_T1_${System.currentTimeMillis()}"
    val code2 = s"AST_T2_${System.currentTimeMillis()}"
    val duplicateTag = s"TAG_DUP_${System.currentTimeMillis()}"

    val json1 = s"""{
      "assetCode":"$code1",
      "assetTag":"$duplicateTag",
      "name":"Asset 1",
      "assetTypeId":$testAssetTypeId,
      "quantity":1
    }"""

    val json2 = s"""{
      "assetCode":"$code2",
      "assetTag":"$duplicateTag",
      "name":"Asset 2",
      "assetTypeId":$testAssetTypeId,
      "quantity":1
    }"""

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, json1)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.Created
    }

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, json2)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.Conflict
      responseAs[String] should include("already exists")
    }
  }

  test("PATCH /api/assets/{id}/verification: ADMIN can update physical verification status directly") {
    val code = s"AST_VER_${System.currentTimeMillis()}"
    val json = s"""{
      "assetCode":"$code",
      "name":"Grid Controller",
      "assetTypeId":$testAssetTypeId,
      "quantity":1,
      "verificationStatus":"NOT_CHECKED"
    }"""

    var createdId: Long = 0L

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      val idRegex = """"id":(\d+)""".r
      createdId = idRegex.findFirstMatchIn(responseAs[String]).map(_.group(1).toLong).get
    }

    val patchJson = """{
      "verificationStatus":"FOUND",
      "serialNumberFound":"SN-AUDITED-123"
    }"""

    Patch(s"/api/assets/$createdId/verification", HttpEntity(ContentTypes.`application/json`, patchJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      val res = responseAs[String]
      res should include("FOUND")
      res should include("SN-AUDITED-123")
    }
  }

  test("DELETE /api/assets/{id}: ADMIN can delete individual asset directly") {
    val code = s"AST_DEL_${System.currentTimeMillis()}"
    val json = s"""{
      "assetCode":"$code",
      "name":"Deletable Asset",
      "assetTypeId":$testAssetTypeId,
      "quantity":1
    }"""

    var createdId: Long = 0L

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      val idRegex = """"id":(\d+)""".r
      createdId = idRegex.findFirstMatchIn(responseAs[String]).map(_.group(1).toLong).get
    }

    Delete(s"/api/assets/$createdId") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.NoContent
    }

    Get(s"/api/assets/$createdId") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.NotFound
    }
  }

  test("POST /api/assets: Rejects negative quantity with 400 Bad Request") {
    val code = s"AST_NEG_${System.currentTimeMillis()}"
    val json = s"""{
      "assetCode":"$code",
      "name":"Negative Quantity Asset",
      "assetTypeId":$testAssetTypeId,
      "quantity":-5
    }"""

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.BadRequest
    }
  }

  test("POST /api/assets: Rejects non-existent assetTypeId with 400 Bad Request") {
    val code = s"AST_NO_TYPE_${System.currentTimeMillis()}"
    val json = s"""{
      "assetCode":"$code",
      "name":"Missing Type Asset",
      "assetTypeId":999999,
      "quantity":1
    }"""

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.BadRequest
    }
  }

  test("POST /api/assets: Rejects duplicate assetCode with 409 Conflict") {
    val code = s"AST_DUP_${System.currentTimeMillis()}"
    val json = s"""{
      "assetCode":"$code",
      "name":"Duplicate Code Asset",
      "assetTypeId":$testAssetTypeId,
      "quantity":1
    }"""

    // Create once
    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.Created
    }

    // Attempt second creation with same asset code
    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.Conflict
    }
  }

  test("GET /api/assets: Rejects invalid page size with 400 Bad Request") {
    Get("/api/assets?pageSize=500") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.BadRequest
    }
  }

  test("CUSTODIAN Security: Comprehensive role and asset-level authorization verification") {
    // 1. Create test assets under Admin: Asset 1 for Custodian 1, Asset 2 for Custodian 2, Asset 3 unassigned
    val code1 = s"AST_CUST1_${System.currentTimeMillis()}"
    val code2 = s"AST_CUST2_${System.currentTimeMillis()}"
    val code3 = s"AST_UNASSIGNED_${System.currentTimeMillis()}"

    def createAssetJson(code: String, custIdOpt: Option[Long], ownerIdOpt: Option[Long] = None): String = s"""{
      "assetCode":"$code",
      "name":"Physical Test Device",
      "assetTypeId":$testAssetTypeId,
      "quantity":1,
      "status":"AVAILABLE",
      "verificationStatus":"NOT_CHECKED"
      ${custIdOpt.map(cid => s""", "custodianId":$cid""").getOrElse("")}
      ${ownerIdOpt.map(oid => s""", "assetOwnerId":$oid""").getOrElse("")}
    }"""

    var id1 = 0L
    var id2 = 0L
    var id3 = 0L

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, createAssetJson(code1, Some(TestDbHelper.custodianId), Some(TestDbHelper.adminId)))) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      val idRegex = """"id":(\d+)""".r
      id1 = idRegex.findFirstMatchIn(responseAs[String]).map(_.group(1).toLong).get
    }

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, createAssetJson(code2, Some(TestDbHelper.custodian2Id), Some(TestDbHelper.adminId)))) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      val idRegex = """"id":(\d+)""".r
      id2 = idRegex.findFirstMatchIn(responseAs[String]).map(_.group(1).toLong).get
    }

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, createAssetJson(code3, None))) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      val idRegex = """"id":(\d+)""".r
      id3 = idRegex.findFirstMatchIn(responseAs[String]).map(_.group(1).toLong).get
    }

    // 2. CUSTODIAN 1 can view only assigned assets (code1); cannot see code2 or code3
    Get("/api/assets") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      val res = responseAs[String]
      res should include(code1)
      res should not include(code2)
      res should not include(code3)
    }

    // 3. CUSTODIAN cannot view another custodian's asset (id2) or unassigned asset (id3) by direct ID
    Get(s"/api/assets/$id2") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.NotFound
    }
    Get(s"/api/assets/$id3") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.NotFound
    }
    Get(s"/api/assets/$id1") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      responseAs[String] should include(code1)
    }

    // 4. CUSTODIAN 1 can update permitted fields of their assigned asset (id1)
    val updateAllowedJson = s"""{
      "assetCode":"$code1",
      "name":"Updated ThinkPad by Custodian",
      "assetTypeId":$testAssetTypeId,
      "quantity":1,
      "status":"AVAILABLE",
      "verificationStatus":"FOUND",
      "custodianId":${TestDbHelper.custodianId},
      "assetOwnerId":${TestDbHelper.adminId},
      "remarks":"Updated by assigned custodian"
    }"""
    Put(s"/api/assets/$id1", HttpEntity(ContentTypes.`application/json`, updateAllowedJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      responseAs[String] should include("Updated ThinkPad by Custodian")
    }

    // 5. CUSTODIAN 1 cannot update another custodian's asset (id2) -> 403 Forbidden
    Put(s"/api/assets/$id2", HttpEntity(ContentTypes.`application/json`, updateAllowedJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }

    // 6. CUSTODIAN 1 cannot reassign custodianId or assetOwnerId -> 403 Forbidden
    val reassignCustodianJson = s"""{
      "assetCode":"$code1",
      "name":"Reassignment Attempt",
      "assetTypeId":$testAssetTypeId,
      "quantity":1,
      "status":"AVAILABLE",
      "verificationStatus":"FOUND",
      "custodianId":${TestDbHelper.custodian2Id},
      "assetOwnerId":${TestDbHelper.adminId}
    }"""
    Put(s"/api/assets/$id1", HttpEntity(ContentTypes.`application/json`, reassignCustodianJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }

    val reassignOwnerJson = s"""{
      "assetCode":"$code1",
      "name":"Owner Reassignment Attempt",
      "assetTypeId":$testAssetTypeId,
      "quantity":1,
      "status":"AVAILABLE",
      "verificationStatus":"FOUND",
      "custodianId":${TestDbHelper.custodianId},
      "assetOwnerId":${TestDbHelper.superAdminId}
    }"""
    Put(s"/api/assets/$id1", HttpEntity(ContentTypes.`application/json`, reassignOwnerJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }

    // 7. CUSTODIAN cannot create assets -> 403 Forbidden
    val newAssetJson = s"""{
      "assetCode":"AST_ILLEGAL_${System.currentTimeMillis()}",
      "name":"Illegal Asset",
      "assetTypeId":$testAssetTypeId,
      "quantity":1
    }"""
    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, newAssetJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }

    // 8. CUSTODIAN cannot delete assets -> 403 Forbidden
    Delete(s"/api/assets/$id1") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }

    // 9. GENERAL user cannot modify assets -> 403 Forbidden
    Put(s"/api/assets/$id1", HttpEntity(ContentTypes.`application/json`, updateAllowedJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }

    Patch(s"/api/assets/$id1/verification", HttpEntity(ContentTypes.`application/json`, """{"verificationStatus":"FOUND"}""")) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.generalToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.Forbidden
    }

    // 10. CUSTODIAN can export assigned assets to Excel workbook
    Get("/api/assets/export") ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.custodianToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.OK
      contentType.toString should include("spreadsheetml.sheet")
    }

    // 11. Cleanup test assets using ADMIN
    Delete(s"/api/assets/$id1") ~> addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.NoContent
    }
    Delete(s"/api/assets/$id2") ~> addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.NoContent
    }
    Delete(s"/api/assets/$id3") ~> addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~> assetRoutes.route ~> check {
      status shouldBe StatusCodes.NoContent
    }
  }

  test("Location & Asset Integration: Admin can create asset with existing location") {
    val locId = Await.result(
      db.run(
        (LocationsTable.query returning LocationsTable.query.map(_.id)) += Location(
          id = 0L,
          description = s"Admin City Match Lab ${System.currentTimeMillis()}",
          seatNo = Some("S-1"),
          floorNo = Some("2"),
          city = Some("Noida"),
          country = Some("India")
        )
      ),
      5.seconds
    )

    val code = s"AST_LOC_${System.currentTimeMillis()}"
    val json = s"""{
      "assetCode":"$code",
      "name":"Calibrated Multi-Meter",
      "assetTypeId":$testAssetTypeId,
      "locationId":$locId,
      "quantity":1
    }"""

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      responseAs[String] should include(code)
      responseAs[String] should include(s""""locationId":$locId""")
    }
  }

  test("Location & Asset Integration: Admin can create asset with inline new location in single transaction") {
    val code = s"AST_INLINE_${System.currentTimeMillis()}"
    val desc = s"Inline Test Lab ${System.currentTimeMillis()}"
    val json = s"""{
      "assetCode":"$code",
      "name":"Edge Router Switch",
      "assetTypeId":$testAssetTypeId,
      "quantity":1,
      "newLocation":{
        "description":"$desc",
        "seatNo":"Seat-42",
        "floorNo":"3rd Floor"
      }
    }"""

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, json)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.Created
      responseAs[String] should include(code)
      // Verify location was created with admin's City and Country from DB
      val locInDb = Await.result(
        db.run(sql"SELECT description, seat_no, floor_no, city, country FROM locations WHERE description = $desc".as[(String, Option[String], Option[String], Option[String], Option[String])].headOption),
        5.seconds
      )
      locInDb shouldBe defined
      locInDb.get._1 shouldBe desc
      locInDb.get._2 shouldBe Some("Seat-42")
      locInDb.get._3 shouldBe Some("3rd Floor")
      locInDb.get._4 shouldBe Some("Noida")
      locInDb.get._5 shouldBe Some("India")
    }
  }

  test("Location & Asset Integration: Failed asset creation rolls back newly created location") {
    val code = s"AST_EXISTING_${System.currentTimeMillis()}"
    // Create pre-existing asset with this code
    val setupJson = s"""{
      "assetCode":"$code",
      "name":"Pre-existing Asset",
      "assetTypeId":$testAssetTypeId,
      "quantity":1
    }"""
    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, setupJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.Created
    }

    // Now attempt to create duplicate asset with a new inline location
    val orphanDesc = s"Rollback_Check_Loc_${System.currentTimeMillis()}"
    val failingJson = s"""{
      "assetCode":"$code",
      "name":"Duplicate Code Asset",
      "assetTypeId":$testAssetTypeId,
      "quantity":1,
      "newLocation":{
        "description":"$orphanDesc",
        "seatNo":"Seat-99",
        "floorNo":"1st Floor"
      }
    }"""

    Post("/api/assets", HttpEntity(ContentTypes.`application/json`, failingJson)) ~>
      addHeader(Authorization(OAuth2BearerToken(TestDbHelper.adminToken))) ~>
      assetRoutes.route ~> check {
      status shouldBe StatusCodes.Conflict

      // CRITICAL ACCEPTANCE CHECK: Verify newly created location was rolled back!
      val locCount = Await.result(
        db.run(sql"SELECT COUNT(*) FROM locations WHERE description = $orphanDesc".as[Int].head),
        5.seconds
      )
      locCount shouldBe 0
    }
  }
}
