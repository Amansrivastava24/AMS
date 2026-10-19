package org.example.export

import org.apache.poi.ss.usermodel._
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.example.assets.AssetExportRow

import java.io.ByteArrayOutputStream
import java.time.format.DateTimeFormatter

object ExcelExportService {

  private val DateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")

  private val Headers = Seq(
    "Asset Code",
    "Asset Tag",
    "Serial Number",
    "Serial Number Found",
    "Asset Name",
    "Asset Type",
    "Status",
    "Verification Status",
    "Quantity",
    "Actual Found",
    "Cost Center",
    "Asset Owner",
    "Current Custodian",
    "Location",
    "Floor",
    "Room / Seat",
    "Date of Checking",
    "Gate Pass Number",
    "Tagging Status",
    "Make / Model",
    "Remarks"
  )

  /**
   * Sanitizes untrusted text to prevent Excel / Spreadsheet Formula Injection (CSV injection).
   * Characters =, +, -, @, tab, or CR at the start of a cell could trigger formula execution.
   */
  def sanitizeCellText(value: String): String = {
    if (value == null || value.isEmpty) ""
    else {
      val first = value.charAt(0)
      if (first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r') {
        "'" + value
      } else {
        val trimmed = value.trim
        if (trimmed.nonEmpty && (trimmed.charAt(0) == '=' || trimmed.charAt(0) == '+' || trimmed.charAt(0) == '-' || trimmed.charAt(0) == '@')) {
          "'" + trimmed
        } else {
          trimmed
        }
      }
    }
  }

  def generateAssetWorkbook(rows: Seq[AssetExportRow]): Array[Byte] = {
    val workbook = new XSSFWorkbook()
    try {
      val sheet = workbook.createSheet("Assets")

      // Header style
      val headerFont = workbook.createFont()
      headerFont.setBold(true)
      headerFont.setColor(IndexedColors.WHITE.getIndex)

      val headerStyle = workbook.createCellStyle()
      headerStyle.setFont(headerFont)
      headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex)
      headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND)
      headerStyle.setAlignment(HorizontalAlignment.CENTER)

      // Create header row
      val headerRow = sheet.createRow(0)
      Headers.zipWithIndex.foreach { case (header, colIdx) =>
        val cell = headerRow.createCell(colIdx)
        cell.setCellValue(header)
        cell.setCellStyle(headerStyle)
      }

      // Populate data rows
      var rowIdx = 1
      rows.foreach { asset =>
        val row = sheet.createRow(rowIdx)
        rowIdx += 1

        row.createCell(0).setCellValue(sanitizeCellText(asset.assetCode))
        row.createCell(1).setCellValue(sanitizeCellText(asset.assetTag.getOrElse("")))
        row.createCell(2).setCellValue(sanitizeCellText(asset.serialNumber.getOrElse("")))
        row.createCell(3).setCellValue(sanitizeCellText(asset.serialNumberFound.getOrElse("")))
        row.createCell(4).setCellValue(sanitizeCellText(asset.name))
        row.createCell(5).setCellValue(sanitizeCellText(asset.assetTypeName))
        row.createCell(6).setCellValue(sanitizeCellText(asset.status))
        row.createCell(7).setCellValue(sanitizeCellText(asset.verificationStatus))
        row.createCell(8).setCellValue(asset.quantity.toDouble)

        asset.actualFound match {
          case Some(found) => row.createCell(9).setCellValue(found.toDouble)
          case None        => row.createCell(9).setCellValue("")
        }

        row.createCell(10).setCellValue(sanitizeCellText(asset.costCenter.getOrElse("")))
        row.createCell(11).setCellValue(sanitizeCellText(asset.assetOwnerName.getOrElse("")))
        row.createCell(12).setCellValue(sanitizeCellText(asset.custodianName.getOrElse("")))
        row.createCell(13).setCellValue(sanitizeCellText(asset.locationName.getOrElse("")))
        row.createCell(14).setCellValue(sanitizeCellText(asset.floor.getOrElse("")))
        row.createCell(15).setCellValue(sanitizeCellText(asset.roomLocation.getOrElse("")))

        val dateStr = asset.dateOfChecking.map(_.format(DateFormatter)).getOrElse("")
        row.createCell(16).setCellValue(dateStr)

        row.createCell(17).setCellValue(sanitizeCellText(asset.gatePassNumber.getOrElse("")))
        row.createCell(18).setCellValue(sanitizeCellText(asset.taggingStatus.getOrElse("")))
        row.createCell(19).setCellValue(sanitizeCellText(asset.makeModel.getOrElse("")))
        row.createCell(20).setCellValue(sanitizeCellText(asset.remarks.getOrElse("")))
      }

      // Auto-size columns up to reasonable width
      for (col <- Headers.indices) {
        sheet.autoSizeColumn(col)
      }

      val out = new ByteArrayOutputStream()
      workbook.write(out)
      out.toByteArray
    } finally {
      workbook.close()
    }
  }
}
