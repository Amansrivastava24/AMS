package org.example.assets

import org.example.TestDbHelper
import org.example.common.JsonSupport
import org.example.db.Database
import org.example.locations.LocationRepository
import org.example.users.UserRepository
import org.junit.runner.RunWith
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.junit.JUnitRunner

import scala.concurrent.Await
import scala.concurrent.duration._

@RunWith(classOf[JUnitRunner])
class AssetLocationUnitSpec extends AnyFunSuite with Matchers {

  TestDbHelper.ensureInitialized()

  implicit val ec: scala.concurrent.ExecutionContext = scala.concurrent.ExecutionContext.global

  val db = Database.slickDatabase
  val assetRepo = new AssetRepository(db)
  val locRepo = new LocationRepository(db)
  val userRepo = new UserRepository(db)
  val service = new AssetService(assetRepo, locRepo, userRepo)

  test("CreateAssetRequest JSON deserialization: cleanly parses newLocation object") {
    val json = """{
      "assetCode":"TEST_AST_001",
      "name":"Dell Latitude 5520",
      "assetTypeId":1,
      "status":"AVAILABLE",
      "verificationStatus":"NOT_CHECKED",
      "taggingStatus":"T",
      "newLocation": {
        "description":"Hardware Engineering Lab",
        "seatNo":"BENCH-02",
        "floorNo":"3rd Floor"
      }
    }"""

    val reqTry = JsonSupport.fromJson[CreateAssetRequest](json)
    reqTry.isSuccess shouldBe true
    val req = reqTry.get
    req.assetCode shouldBe "TEST_AST_001"
    req.newLocation.isDefined shouldBe true
    val inlineLoc = req.newLocation.get
    inlineLoc.description shouldBe "Hardware Engineering Lab"
    inlineLoc.seatNo shouldBe Some("BENCH-02")
    inlineLoc.floorNo shouldBe Some("3rd Floor")
    req.locationId shouldBe None
  }

  test("CreateAssetRequest JSON deserialization: cleanly parses existing locationId") {
    val json = """{
      "assetCode":"TEST_AST_002",
      "name":"MacBook Pro 16",
      "assetTypeId":1,
      "status":"ASSIGNED",
      "verificationStatus":"FOUND",
      "taggingStatus":"T",
      "locationId":42
    }"""

    val reqTry = JsonSupport.fromJson[CreateAssetRequest](json)
    reqTry.isSuccess shouldBe true
    val req = reqTry.get
    req.locationId shouldBe Some(42L)
    req.newLocation shouldBe None
  }

  test("AssetService.createAsset: Rejects GENERAL user from creating asset with 403 Forbidden") {
    val req = CreateAssetRequest(
      assetCode = s"GEN_FORBIDDEN_${System.currentTimeMillis()}",
      name = "Restricted Asset",
      assetTypeId = 1L,
      status = Some("AVAILABLE"),
      verificationStatus = Some("NOT_CHECKED"),
      taggingStatus = Some("NA")
    )

    val result = Await.result(service.createAsset(TestDbHelper.generalId, "GENERAL", req), 5.seconds)
    result.isLeft shouldBe true
    result.left.get.message should include("Only Admins and Super Admins can create assets")
  }

  test("AssetService.createAsset: Rejects CUSTODIAN user from creating asset with 403 Forbidden") {
    val req = CreateAssetRequest(
      assetCode = s"CUST_FORBIDDEN_${System.currentTimeMillis()}",
      name = "Restricted Custodian Asset",
      assetTypeId = 1L,
      status = Some("AVAILABLE"),
      verificationStatus = Some("NOT_CHECKED"),
      taggingStatus = Some("NA")
    )

    val result = Await.result(service.createAsset(TestDbHelper.custodianId, "CUSTODIAN", req), 5.seconds)
    result.isLeft shouldBe true
    result.left.get.message should include("Only Admins and Super Admins can create assets")
  }

  test("AssetService.createAsset: Rejects non-existent existing locationId with 400 Bad Request") {
    val req = CreateAssetRequest(
      assetCode = s"LOC_NOT_FOUND_${System.currentTimeMillis()}",
      name = "Ghost Location Asset",
      assetTypeId = 1L,
      status = Some("AVAILABLE"),
      verificationStatus = Some("NOT_CHECKED"),
      taggingStatus = Some("NA"),
      locationId = Some(999999999L)
    )

    val result = Await.result(service.createAsset(TestDbHelper.adminId, "ADMIN", req), 5.seconds)
    result.isLeft shouldBe true
    result.left.get.message should include("Location ID 999999999 does not exist")
  }

  test("AssetService.createAsset: Rejects inline location with empty description") {
    val req = CreateAssetRequest(
      assetCode = s"EMPTY_LOC_${System.currentTimeMillis()}",
      name = "Empty Location Asset",
      assetTypeId = 1L,
      status = Some("AVAILABLE"),
      verificationStatus = Some("NOT_CHECKED"),
      taggingStatus = Some("NA"),
      newLocation = Some(InlineLocationRequest(description = "   "))
    )

    val result = Await.result(service.createAsset(TestDbHelper.adminId, "ADMIN", req), 5.seconds)
    result.isLeft shouldBe true
    result.left.get.message should include("Location description is required")
  }
}
