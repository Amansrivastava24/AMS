package org.example.assettypes

import slick.jdbc.PostgresProfile.api._
import scala.concurrent.{ExecutionContext, Future}

final class AssetTypeRepository(
    database: slick.jdbc.JdbcBackend.Database
)(implicit executionContext: ExecutionContext) {

  def findAll(): Future[Seq[AssetType]] =
    database.run(AssetTypesTable.query.sortBy(_.name.asc).result)

  def findById(id: Long): Future[Option[AssetType]] =
    database.run(AssetTypesTable.query.filter(_.id === id).result.headOption)

  def findByName(name: String): Future[Option[AssetType]] =
    database.run(
      AssetTypesTable.query
        .filter(t => t.name.toLowerCase === name.trim.toLowerCase)
        .result
        .headOption
    )

  def create(name: String): Future[AssetType] = {
    val cleanName = name.trim
    val insertQuery = (AssetTypesTable.query returning AssetTypesTable.query.map(_.id)) += AssetType(0L, cleanName)
    database.run(insertQuery).map(id => AssetType(id, cleanName))
  }

  def update(id: Long, name: String): Future[Option[AssetType]] = {
    val cleanName = name.trim
    val q = AssetTypesTable.query.filter(_.id === id).map(_.name)
    database.run(q.update(cleanName)).flatMap {
      case 0 => Future.successful(None)
      case _ => findById(id)
    }
  }

  def isReferenced(id: Long): Future[Boolean] = {
    val checkQuery = sql"SELECT COUNT(*) FROM assets WHERE asset_type_id = $id".as[Int].head
    database.run(checkQuery).map(_ > 0)
  }

  def delete(id: Long): Future[Boolean] =
    database.run(AssetTypesTable.query.filter(_.id === id).delete).map(_ > 0)
}
