package org.example.locations

import org.example.TestDbHelper
import org.example.common.ValidationError
import org.example.db.Database
import org.junit.runner.RunWith
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.junit.JUnitRunner

import scala.concurrent.Await
import scala.concurrent.duration._

@RunWith(classOf[JUnitRunner])
class LocationServiceSpec extends AnyFunSuite with Matchers {

  TestDbHelper.ensureInitialized()

  implicit val ec: scala.concurrent.ExecutionContext = scala.concurrent.ExecutionContext.global

  val db = Database.slickDatabase
  val repository = new LocationRepository(db)
  val service = new LocationService(repository)

  test("LocationService.createLocation: Rejects empty or whitespace description with ValidationError") {
    val req = LocationRequest(
      description = "   ",
      seatNo = Some("S-1"),
      floorNo = Some("2"),
      city = Some("Noida"),
      country = Some("India")
    )

    val result = Await.result(service.createLocation(req), 5.seconds)
    result.isLeft shouldBe true
    result.left.get shouldBe a[ValidationError]
    result.left.get.message should include("Location description must not be empty")
  }

  test("LocationService.createLocation: Successfully creates location with trimmed fields") {
    val uniqueDesc = s"ServiceTest_Lab_${System.currentTimeMillis()}"
    val req = LocationRequest(
      description = s"  $uniqueDesc  ",
      seatNo = Some("  Seat-999  "),
      floorNo = Some("  3rd Floor  "),
      city = Some("Noida"),
      country = Some("India")
    )

    val result = Await.result(service.createLocation(req), 5.seconds)
    result.isRight shouldBe true
    val created = result.toOption.get
    created.id should be > 0L
    created.description shouldBe uniqueDesc
    created.seatNo shouldBe Some("Seat-999")
    created.floorNo shouldBe Some("3rd Floor")
    created.city shouldBe Some("Noida")
    created.country shouldBe Some("India")
  }

  test("LocationService.createLocation: Rejects if adminProfile is missing city or country") {
    val req = LocationRequest(description = "Admin Validation Location")
    val missingCityProfile = Some((None: Option[String], Some("India"): Option[String]))

    val result = Await.result(service.createLocation(req, missingCityProfile), 5.seconds)
    result.isLeft shouldBe true
    result.left.get.message should include("Admin profile is missing City or Country")
  }

  test("LocationService.createLocation: Inherits city and country when valid adminProfile is provided") {
    val uniqueDesc = s"AdminInherited_${System.currentTimeMillis()}"
    val req = LocationRequest(description = uniqueDesc, seatNo = Some("Bench-A"))
    val adminProfile = Some((Some("Noida"): Option[String], Some("India"): Option[String]))

    val result = Await.result(service.createLocation(req, adminProfile), 5.seconds)
    result.isRight shouldBe true
    val created = result.toOption.get
    created.description shouldBe uniqueDesc
    created.city shouldBe Some("Noida")
    created.country shouldBe Some("India")
  }

  test("LocationService.getLocation: Returns existing location by ID and None for missing ID") {
    val uniqueDesc = s"LookupTest_${System.currentTimeMillis()}"
    val req = LocationRequest(description = uniqueDesc)
    val created = Await.result(service.createLocation(req), 5.seconds).toOption.get

    val fetched = Await.result(service.getLocation(created.id), 5.seconds)
    fetched.isDefined shouldBe true
    fetched.get.id shouldBe created.id
    fetched.get.description shouldBe uniqueDesc

    val notFound = Await.result(service.getLocation(999999999L), 5.seconds)
    notFound shouldBe None
  }

  test("LocationService.listLocations: Finds locations matching search query") {
    val keyword = s"SearchKW_${System.currentTimeMillis()}"
    val req1 = LocationRequest(description = s"Room $keyword Alpha", floorNo = Some("1"))
    val req2 = LocationRequest(description = s"Room $keyword Beta", seatNo = Some(s"Seat-$keyword"))

    Await.result(service.createLocation(req1), 5.seconds)
    Await.result(service.createLocation(req2), 5.seconds)

    val results = Await.result(service.listLocations(Some(keyword)), 5.seconds)
    results.length should be >= 2
    results.exists(_.description.contains(keyword)) shouldBe true
  }
}
