package org.example.departments

import org.example.common._
import scala.concurrent.{ExecutionContext, Future}

final class DepartmentService(
    repository: DepartmentRepository
)(implicit executionContext: ExecutionContext) {

  def listDepartments(): Future[Seq[Department]] =
    repository.findAll()

  def getDepartment(id: Long): Future[Option[Department]] =
    repository.findById(id)

  def createDepartment(name: String): Future[Either[ServiceError, Department]] = {
    val clean = Option(name).map(_.trim).getOrElse("")
    if (clean.isEmpty) {
      Future.successful(Left(ValidationError("Department name must not be empty")))
    } else if (clean.length > 100) {
      Future.successful(Left(ValidationError("Department name must not exceed 100 characters")))
    } else {
      repository.findByName(clean).flatMap {
        case Some(_) =>
          Future.successful(Left(ConflictError(s"Department with name '$clean' already exists")))
        case None =>
          repository.create(clean).map(Right(_))
      }
    }
  }

  def updateDepartment(id: Long, name: String): Future[Either[ServiceError, Department]] = {
    val clean = Option(name).map(_.trim).getOrElse("")
    if (clean.isEmpty) {
      Future.successful(Left(ValidationError("Department name must not be empty")))
    } else if (clean.length > 100) {
      Future.successful(Left(ValidationError("Department name must not exceed 100 characters")))
    } else {
      repository.findById(id).flatMap {
        case None =>
          Future.successful(Left(NotFoundError("Department not found")))
        case Some(_) =>
          repository.findByName(clean).flatMap {
            case Some(existing) if existing.id != id =>
              Future.successful(Left(ConflictError(s"Department with name '$clean' already exists")))
            case _ =>
              repository.update(id, clean).map {
                case Some(dep) => Right(dep)
                case None => Left(NotFoundError("Department not found"))
              }
          }
      }
    }
  }

  def deleteDepartment(id: Long): Future[Either[ServiceError, Boolean]] = {
    repository.findById(id).flatMap {
      case None =>
        Future.successful(Left(NotFoundError("Department not found")))
      case Some(_) =>
        repository.isReferenced(id).flatMap { referenced =>
          if (referenced) {
            Future.successful(Left(ConflictError("Cannot delete department because it is assigned to existing users")))
          } else {
            repository.delete(id).map(Right(_))
          }
        }
    }
  }
}
