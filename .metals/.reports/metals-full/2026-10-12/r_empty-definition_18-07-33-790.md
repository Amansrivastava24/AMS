error id: file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/assets/AssetRepository.scala:ExecutionContext#
file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/assets/AssetRepository.scala
empty definition using pc, found symbol in pc: 
empty definition using semanticdb
empty definition using fallback
non-local guesses:
	 -slick/jdbc/PostgresProfile.api.ExecutionContext#
	 -scala/concurrent/ExecutionContext#
	 -ExecutionContext#
	 -scala/Predef.ExecutionContext#
offset: 373
uri: file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/assets/AssetRepository.scala
text:
```scala

package org.example.assets

import org.example.db.Database
import slick.jdbc.PostgresProfile.api._

import scala.concurrent.{ExecutionContext, Future}

final case class AssetPage(
    items: Seq[Asset],
    page: Int,
    pageSize: Int,
    totalItems: Int
)

final class AssetRepository(
    database: slick.jdbc.JdbcBackend.Database
)(implicit executionContext: Executio@@nContext) {

  def findAll(
      page: Int,
      pageSize: Int,
      search: Option[String]
  ): Future[AssetPage] = {

    val safePage = math.max(1, page)
    val safePageSize = math.max(1, math.min(pageSize, 100))
    val offset = (safePage - 1).toLong * safePageSize

    val baseQuery = search
      .map(_.trim)
      .filter(_.nonEmpty)
      .map { term =>
        val pattern = s"%${term.toLowerCase}%"

        AssetsTable.query.filter { asset =>
          asset.assetCode.toLowerCase.like(pattern) ||
          asset.name.toLowerCase.like(pattern)
        }
      }
      .getOrElse(AssetsTable.query)

    val itemsAction = baseQuery
      .sortBy(_.id.desc)
      .drop(offset)
      .take(safePageSize)
      .result

    val countAction = baseQuery.length.result

    database.run(
      for {
        items <- itemsAction
        total <- countAction
      } yield AssetPage(items, safePage, safePageSize, total)
    )
  }

  def findById(id: Long): Future[Option[Asset]] =
    database.run(
      AssetsTable.query
        .filter(_.id === id)
        .result
        .headOption
    )

    def create(asset: Asset): Future[Asset] = {
        val insertQuery = AssetsTable.query returning
            AssetsTable.query.map(_.id)

        val insertAction = insertQuery += asset

        database.run(insertAction).flatMap { id =>
            findById(id).map {
            case Some(createdAsset) => createdAsset
            case None =>
                throw new NoSuchElementException(
                s"Asset with id $id was not found after insertion"
                )
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
    def delete(id: Long): Future[Int] =
        database.run(
            AssetsTable.query
            .filter(_.id === id)
            .delete
        )


    def findAll(
        page: Int,
        pageSize: Int,
        search: Option[String],
        assetTypeId: Option[Long] = None,
        assetOwnerId: Option[Long] = None,
        custodianId: Option[Long] = None,
        costCenter: Option[String] = None,
        taggingStatus: Option[String] = None,
        locationId: Option[Long] = None
    ): Future[AssetPage] = {

    val safePage = math.max(1, page)
    val safePageSize = math.max(1, math.min(pageSize, 100))
    val offset = (safePage - 1).toLong * safePageSize

    val filteredQuery = AssetsTable.query
        .filterOpt(search.map(_.trim).filter(_.nonEmpty)) {
        case (asset, term) =>
            val pattern = s"%${term.toLowerCase}%"
            asset.assetCode.toLowerCase.like(pattern) ||
            asset.name.toLowerCase.like(pattern)
        }
        .filterOpt(assetTypeId) { (asset, id) =>
        asset.assetTypeId === id
        }
        .filterOpt(assetOwnerId) { (asset, id) =>
        asset.assetOwnerId === Option(id)
        }
        .filterOpt(custodianId) { (asset, id) =>
        asset.custodianId === Option(id)
        }
        .filterOpt(costCenter.map(_.trim).filter(_.nonEmpty)) {
        (asset, value) => asset.costCenter === Option(value)
        }
        .filterOpt(taggingStatus.map(_.trim.toUpperCase).filter(_.nonEmpty)) {
        (asset, value) => asset.taggingStatus === Option(value)
        }
        .filterOpt(locationId) { (asset, id) =>
        asset.locationId === Option(id)
        }

    val itemsAction = filteredQuery
        .sortBy(_.id.desc)
        .drop(offset)
        .take(safePageSize)
        .result

    val countAction = filteredQuery.length.result

    database.run(
        for {
        items <- itemsAction
        total <- countAction
        } yield AssetPage(items, safePage, safePageSize, total)
    )
    }
}

```


#### Short summary: 

empty definition using pc, found symbol in pc: 