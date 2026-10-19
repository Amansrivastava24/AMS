error id: file:///C:/Users/SrivasAm/Downloads/AMS/app/src/main/scala/org/example/assets/AssetRepository.scala:returning.
file:///C:/Users/SrivasAm/Downloads/AMS/app/src/main/scala/org/example/assets/AssetRepository.scala
empty definition using pc, found symbol in pc: 
empty definition using semanticdb
empty definition using fallback
non-local guesses:
	 -slick/jdbc/PostgresProfile.api.returning.
	 -slick/jdbc/PostgresProfile.api.returning#
	 -slick/jdbc/PostgresProfile.api.returning().
	 -returning.
	 -returning#
	 -returning().
	 -scala/Predef.returning.
	 -scala/Predef.returning#
	 -scala/Predef.returning().
offset: 1580
uri: file:///C:/Users/SrivasAm/Downloads/AMS/app/src/main/scala/org/example/assets/AssetRepository.scala
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
)(implicit executionContext: ExecutionContext) {

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
        val insertQuery = AssetsTable.query returnin@@g
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
}

```


#### Short summary: 

empty definition using pc, found symbol in pc: 