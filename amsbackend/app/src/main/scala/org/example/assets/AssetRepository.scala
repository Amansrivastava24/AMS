package org.example.assets

import org.example.assettypes.AssetTypesTable
import org.example.locations.LocationsTable
import org.example.users.UsersTable
import slick.jdbc.PostgresProfile.api._

import java.time.LocalDate
import scala.concurrent.{ExecutionContext, Future}

final case class AssetPage(
    items: Seq[Asset],
    page: Int,
    pageSize: Int,
    totalItems: Int
)

final class AssetRepository(
    database: slick.jdbc.JdbcBackend.Database
)(implicit executionContext: ExecutionContext) {

  private val joinedQuery = for {
    ((((a, at), o), c), l) <- AssetsTable.query
      .join(AssetTypesTable.query).on(_.assetTypeId === _.id)
      .joinLeft(UsersTable.query).on(_._1.assetOwnerId === _.id)
      .joinLeft(UsersTable.query).on(_._1._1.custodianId === _.id)
      .joinLeft(LocationsTable.query).on(_._1._1._1.locationId === _.id)
  } yield (
    a,
    at.name,
    o.map(_.name),
    c.map(_.name),
    l.map(_.name),
    l.flatMap(_.floor),
    l.flatMap(_.roomLocation),
    o.flatMap(_.departmentId),
    c.flatMap(_.departmentId)
  )

  private def buildFilteredQuery(filter: AssetFilter) = {
    var q = joinedQuery

    filter.search.map(_.trim).filter(_.nonEmpty).foreach { term =>
      val pattern = s"%${term.toLowerCase}%"
      q = q.filter { case (a, _, _, _, _, _, _, _, _) =>
        a.assetCode.toLowerCase.like(pattern) ||
        a.name.toLowerCase.like(pattern) ||
        a.assetTag.map(_.toLowerCase).like(pattern) ||
        a.serialNumber.map(_.toLowerCase).like(pattern)
      }
    }

    filter.assetCode.map(_.trim).filter(_.nonEmpty).foreach { code =>
      val pattern = s"%${code.toLowerCase}%"
      q = q.filter { case (a, _, _, _, _, _, _, _, _) =>
        a.assetCode.toLowerCase.like(pattern)
      }
    }

    filter.assetTag.map(_.trim).filter(_.nonEmpty).foreach { tag =>
      val pattern = s"%${tag.toLowerCase}%"
      q = q.filter { case (a, _, _, _, _, _, _, _, _) =>
        a.assetTag.map(_.toLowerCase).like(pattern)
      }
    }

    filter.serialNumber.map(_.trim).filter(_.nonEmpty).foreach { sn =>
      val pattern = s"%${sn.toLowerCase}%"
      q = q.filter { case (a, _, _, _, _, _, _, _, _) =>
        a.serialNumber.map(_.toLowerCase).like(pattern)
      }
    }

    filter.name.map(_.trim).filter(_.nonEmpty).foreach { n =>
      val pattern = s"%${n.toLowerCase}%"
      q = q.filter { case (a, _, _, _, _, _, _, _, _) =>
        a.name.toLowerCase.like(pattern)
      }
    }

    filter.status.map(_.trim.toUpperCase).filter(_.nonEmpty).foreach { st =>
      q = q.filter { case (a, _, _, _, _, _, _, _, _) => a.status === st }
    }

    filter.verificationStatus.map(_.trim.toUpperCase).filter(_.nonEmpty).foreach { vs =>
      q = q.filter { case (a, _, _, _, _, _, _, _, _) => a.verificationStatus === vs }
    }

    filter.assetTypeId.foreach { tid =>
      q = q.filter { case (a, _, _, _, _, _, _, _, _) => a.assetTypeId === tid }
    }

    filter.assetOwnerId.foreach { oid =>
      q = q.filter { case (a, _, _, _, _, _, _, _, _) => a.assetOwnerId === Option(oid) }
    }

    filter.custodianId.foreach { cid =>
      q = q.filter { case (a, _, _, _, _, _, _, _, _) => a.custodianId === Option(cid) }
    }

    filter.departmentId.foreach { did =>
      q = q.filter { case (_, _, _, _, _, _, _, oDept, cDept) =>
        oDept === Option(did) || cDept === Option(did)
      }
    }

    filter.locationId.foreach { lid =>
      q = q.filter { case (a, _, _, _, _, _, _, _, _) => a.locationId === Option(lid) }
    }

    filter.floor.map(_.trim).filter(_.nonEmpty).foreach { f =>
      q = q.filter { case (_, _, _, _, _, floorOpt, _, _, _) =>
        floorOpt === Option(f)
      }
    }

    filter.roomLocation.map(_.trim).filter(_.nonEmpty).foreach { r =>
      val pattern = s"%${r.toLowerCase}%"
      q = q.filter { case (_, _, _, _, _, _, roomOpt, _, _) =>
        roomOpt.map(_.toLowerCase).like(pattern)
      }
    }

    filter.costCenter.map(_.trim).filter(_.nonEmpty).foreach { cc =>
      q = q.filter { case (a, _, _, _, _, _, _, _, _) =>
        a.costCenter === Option(cc)
      }
    }

    filter.taggingStatus.map(_.trim.toUpperCase).filter(_.nonEmpty).foreach { ts =>
      q = q.filter { case (a, _, _, _, _, _, _, _, _) =>
        a.taggingStatus === Option(ts)
      }
    }

    filter.dateOfChecking.foreach { doc =>
      q = q.filter { case (a, _, _, _, _, _, _, _, _) =>
        a.dateOfChecking === Option(doc)
      }
    }

    q
  }

  def findAll(page: Int, pageSize: Int, filter: AssetFilter): Future[AssetPage] = {
    val safePage = math.max(1, page)
    val safePageSize = math.max(1, math.min(pageSize, 100))
    val offset = (safePage - 1).toLong * safePageSize

    val q = buildFilteredQuery(filter)

    val isAsc = filter.sortOrder.exists(_.equalsIgnoreCase("asc"))
    val sorted = filter.sortBy.map(_.toLowerCase).getOrElse("id") match {
      case "assetcode" => if (isAsc) q.sortBy(_._1.assetCode.asc) else q.sortBy(_._1.assetCode.desc)
      case "assettag"  => if (isAsc) q.sortBy(_._1.assetTag.asc) else q.sortBy(_._1.assetTag.desc)
      case "name"      => if (isAsc) q.sortBy(_._1.name.asc) else q.sortBy(_._1.name.desc)
      case "status"    => if (isAsc) q.sortBy(_._1.status.asc) else q.sortBy(_._1.status.desc)
      case "verificationstatus" => if (isAsc) q.sortBy(_._1.verificationStatus.asc) else q.sortBy(_._1.verificationStatus.desc)
      case "quantity"  => if (isAsc) q.sortBy(_._1.quantity.asc) else q.sortBy(_._1.quantity.desc)
      case "costcenter"=> if (isAsc) q.sortBy(_._1.costCenter.asc) else q.sortBy(_._1.costCenter.desc)
      case "dateofchecking" => if (isAsc) q.sortBy(_._1.dateOfChecking.asc) else q.sortBy(_._1.dateOfChecking.desc)
      case _           => if (isAsc) q.sortBy(_._1.id.asc) else q.sortBy(_._1.id.desc)
    }

    val itemsAction = sorted.map(_._1).drop(offset).take(safePageSize).result
    val countAction = q.length.result

    database.run(itemsAction.zip(countAction)).map { case (items, total) =>
      AssetPage(items, safePage, safePageSize, total)
    }
  }

  def findForExport(filter: AssetFilter): Future[Seq[AssetExportRow]] = {
    val q = buildFilteredQuery(filter).sortBy(_._1.id.asc)

    database.run(q.result).map { rows =>
      rows.map { case (a, atName, oName, cName, lName, floor, room, _, _) =>
        AssetExportRow(
          id = a.id,
          assetCode = a.assetCode,
          assetTag = a.assetTag,
          serialNumber = a.serialNumber,
          serialNumberFound = a.serialNumberFound,
          name = a.name,
          assetTypeName = atName,
          status = a.status,
          verificationStatus = a.verificationStatus,
          quantity = a.quantity,
          actualFound = a.actualFound,
          costCenter = a.costCenter,
          assetOwnerName = oName,
          custodianName = cName,
          locationName = lName,
          floor = floor,
          roomLocation = room,
          dateOfChecking = a.dateOfChecking,
          gatePassNumber = a.gatePassNumber,
          taggingStatus = a.taggingStatus,
          makeModel = a.makeModel,
          remarks = a.remarks
        )
      }
    }
  }

  def findById(id: Long): Future[Option[Asset]] =
    database.run(AssetsTable.query.filter(_.id === id).result.headOption)

  def findByCode(assetCode: String): Future[Option[Asset]] =
    database.run(
      AssetsTable.query
        .filter(_.assetCode.toLowerCase === assetCode.trim.toLowerCase)
        .result
        .headOption
    )

  def findByTag(assetTag: String): Future[Option[Asset]] =
    database.run(
      AssetsTable.query
        .filter(_.assetTag.toLowerCase === assetTag.trim.toLowerCase)
        .result
        .headOption
    )

  def create(asset: Asset): Future[Asset] = {
    val insertQuery = (AssetsTable.query returning AssetsTable.query.map(_.id)) += asset
    database.run(insertQuery).flatMap { id =>
      findById(id).map {
        case Some(createdAsset) => createdAsset
        case None =>
          throw new NoSuchElementException(s"Asset with id $id was not found after insertion")
      }
    }
  }

  def update(id: Long, asset: Asset): Future[Option[Asset]] = {
    val query = AssetsTable.query.filter(_.id === id)
    database.run(query.result.headOption).flatMap {
      case None =>
        Future.successful(None)
      case Some(existing) =>
        val updated = asset.copy(id = existing.id)
        database.run(query.update(updated)).map {
          case 0 => None
          case _ => Some(updated)
        }
    }
  }

  def updateVerification(id: Long, verificationStatus: String, serialNumberFound: Option[String], dateOfChecking: Option[LocalDate]): Future[Option[Asset]] = {
    findById(id).flatMap {
      case None => Future.successful(None)
      case Some(existing) =>
        val updated = existing.copy(
          verificationStatus = verificationStatus,
          serialNumberFound = serialNumberFound.orElse(existing.serialNumberFound),
          dateOfChecking = dateOfChecking.orElse(existing.dateOfChecking).orElse(Some(LocalDate.now())),
          actualFound = if (verificationStatus == "FOUND") Some(1) else if (verificationStatus == "MISSING") Some(0) else existing.actualFound
        )
        database.run(AssetsTable.query.filter(_.id === id).update(updated)).map {
          case 0 => None
          case _ => Some(updated)
        }
    }
  }

  def delete(id: Long): Future[Int] =
    database.run(AssetsTable.query.filter(_.id === id).delete)

  def isAssetTypeValid(id: Long): Future[Boolean] =
    database.run(AssetTypesTable.query.filter(_.id === id).exists.result)

  def isUserValid(id: Long): Future[Boolean] =
    database.run(UsersTable.query.filter(_.id === id).exists.result)

  def isLocationValid(id: Long): Future[Boolean] =
    database.run(LocationsTable.query.filter(_.id === id).exists.result)
}
