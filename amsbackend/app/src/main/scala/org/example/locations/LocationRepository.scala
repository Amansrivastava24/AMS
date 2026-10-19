package org.example.locations

import slick.jdbc.PostgresProfile.api._
import scala.concurrent.{ExecutionContext, Future}

final class LocationRepository(
    database: slick.jdbc.JdbcBackend.Database
)(implicit executionContext: ExecutionContext) {

  def findAll(search: Option[String] = None, floor: Option[String] = None): Future[Seq[Location]] = {
    var q: Query[LocationsTable, Location, Seq] = LocationsTable.query

    search.map(_.trim).filter(_.nonEmpty).foreach { term =>
      val pattern = s"%${term.toLowerCase}%"
      q = q.filter(l => l.name.toLowerCase.like(pattern) || l.roomLocation.map(_.toLowerCase).like(pattern))
    }

    floor.map(_.trim).filter(_.nonEmpty).foreach { f =>
      q = q.filter(_.floor === Option(f))
    }

    database.run(q.sortBy(_.id.asc).result)
  }

  def findById(id: Long): Future[Option[Location]] =
    database.run(LocationsTable.query.filter(_.id === id).result.headOption)

  def create(req: LocationRequest): Future[Location] = {
    val clean = Location(
      id = 0L,
      name = req.name.trim,
      address = req.address.map(_.trim).filter(_.nonEmpty),
      city = req.city.map(_.trim).filter(_.nonEmpty),
      country = req.country.map(_.trim).filter(_.nonEmpty),
      floor = req.floor.map(_.trim).filter(_.nonEmpty),
      roomLocation = req.roomLocation.map(_.trim).filter(_.nonEmpty)
    )

    val insertQuery = (LocationsTable.query returning LocationsTable.query.map(_.id)) += clean
    database.run(insertQuery).map(id => clean.copy(id = id))
  }

  def update(id: Long, req: LocationRequest): Future[Option[Location]] = {
    val clean = Location(
      id = id,
      name = req.name.trim,
      address = req.address.map(_.trim).filter(_.nonEmpty),
      city = req.city.map(_.trim).filter(_.nonEmpty),
      country = req.country.map(_.trim).filter(_.nonEmpty),
      floor = req.floor.map(_.trim).filter(_.nonEmpty),
      roomLocation = req.roomLocation.map(_.trim).filter(_.nonEmpty)
    )

    database.run(LocationsTable.query.filter(_.id === id).update(clean)).flatMap {
      case 0 => Future.successful(None)
      case _ => Future.successful(Some(clean))
    }
  }

  def isReferenced(id: Long): Future[Boolean] = {
    val assetsCountAction = sql"SELECT COUNT(*) FROM assets WHERE location_id = $id".as[Int].head
    database.run(assetsCountAction).map(_ > 0)
  }

  def delete(id: Long): Future[Boolean] =
    database.run(LocationsTable.query.filter(_.id === id).delete).map(_ > 0)
}
