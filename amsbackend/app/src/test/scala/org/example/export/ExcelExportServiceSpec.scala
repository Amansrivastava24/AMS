package org.example.export

import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.example.assets.AssetExportRow
import org.junit.runner.RunWith
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.junit.JUnitRunner

import java.io.ByteArrayInputStream
import java.time.LocalDate

@RunWith(classOf[JUnitRunner])
class ExcelExportServiceSpec extends AnyFunSuite with Matchers {

  test("sanitizeCellText should escape formula injection characters") {
    ExcelExportService.sanitizeCellText("=SUM(A1:A10)") shouldBe "'=SUM(A1:A10)"
    ExcelExportService.sanitizeCellText("+12345") shouldBe "'+12345"
    ExcelExportService.sanitizeCellText("-cmd /c calc") shouldBe "'-cmd /c calc"
    ExcelExportService.sanitizeCellText("@import") shouldBe "'@import"
    ExcelExportService.sanitizeCellText("\tmalicious") shouldBe "'\tmalicious"
    ExcelExportService.sanitizeCellText("\rmalicious") shouldBe "'\rmalicious"
  }

  test("sanitizeCellText should leave ordinary text unaltered") {
    ExcelExportService.sanitizeCellText("Laptop ThinkPad X1") shouldBe "Laptop ThinkPad X1"
    ExcelExportService.sanitizeCellText("AST-1001") shouldBe "AST-1001"
    ExcelExportService.sanitizeCellText("") shouldBe ""
    ExcelExportService.sanitizeCellText(null) shouldBe ""
  }

  test("generateAssetWorkbook should create valid xlsx for empty result set") {
    val bytes = ExcelExportService.generateAssetWorkbook(Seq.empty)
    bytes should not be empty

    val workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))
    val sheet = workbook.getSheet("Assets")
    sheet should not be null
    sheet.getPhysicalNumberOfRows shouldBe 1 // Header only

    val header = sheet.getRow(0)
    header.getCell(0).getStringCellValue shouldBe "Asset Code"
    header.getCell(1).getStringCellValue shouldBe "Asset Tag"
    header.getCell(2).getStringCellValue shouldBe "Serial Number"
    workbook.close()
  }

  test("generateAssetWorkbook should populate rows with sanitized values") {
    val rows = Seq(
      AssetExportRow(
        id = 1L,
        assetCode = "=AST-001",
        assetTag = Some("TAG-001"),
        serialNumber = Some("SN-12345"),
        serialNumberFound = Some("SN-12345"),
        name = "Dell XPS 15",
        assetTypeName = "Laptop",
        status = "AVAILABLE",
        verificationStatus = "FOUND",
        quantity = 1,
        actualFound = Some(1),
        costCenter = Some("CC-101"),
        assetOwnerName = Some("Alice Smith"),
        custodianName = Some("Bob Jones"),
        locationName = Some("HQ Building"),
        floor = Some("3rd"),
        roomLocation = Some("Room 302"),
        dateOfChecking = Some(LocalDate.of(2026, 5, 10)),
        gatePassNumber = Some("GP-999"),
        taggingStatus = Some("T"),
        makeModel = Some("Dell XPS"),
        remarks = Some("Good condition")
      )
    )

    val bytes = ExcelExportService.generateAssetWorkbook(rows)
    val workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))
    val sheet = workbook.getSheet("Assets")
    sheet.getPhysicalNumberOfRows shouldBe 2 // Header + 1 row

    val dataRow = sheet.getRow(1)
    dataRow.getCell(0).getStringCellValue shouldBe "'=AST-001" // Formula injection prevented
    dataRow.getCell(1).getStringCellValue shouldBe "TAG-001"
    dataRow.getCell(2).getStringCellValue shouldBe "SN-12345"
    dataRow.getCell(3).getStringCellValue shouldBe "SN-12345"
    dataRow.getCell(4).getStringCellValue shouldBe "Dell XPS 15"
    dataRow.getCell(5).getStringCellValue shouldBe "Laptop"
    dataRow.getCell(6).getStringCellValue shouldBe "AVAILABLE"
    dataRow.getCell(7).getStringCellValue shouldBe "FOUND"
    dataRow.getCell(8).getNumericCellValue shouldBe 1.0
    dataRow.getCell(9).getNumericCellValue shouldBe 1.0
    dataRow.getCell(10).getStringCellValue shouldBe "CC-101"
    dataRow.getCell(11).getStringCellValue shouldBe "Alice Smith"
    dataRow.getCell(12).getStringCellValue shouldBe "Bob Jones"
    dataRow.getCell(13).getStringCellValue shouldBe "HQ Building"
    dataRow.getCell(14).getStringCellValue shouldBe "3rd"
    dataRow.getCell(15).getStringCellValue shouldBe "Room 302"
    dataRow.getCell(16).getStringCellValue shouldBe "2026-05-10"
    dataRow.getCell(17).getStringCellValue shouldBe "GP-999"
    dataRow.getCell(18).getStringCellValue shouldBe "T"
    dataRow.getCell(19).getStringCellValue shouldBe "Dell XPS"
    dataRow.getCell(20).getStringCellValue shouldBe "Good condition"

    workbook.close()
  }
}
