package org.example.common

sealed trait ServiceError {
  def message: String
}

case class ValidationError(message: String) extends ServiceError
case class ConflictError(message: String) extends ServiceError
case class NotFoundError(message: String) extends ServiceError
case class ForbiddenError(message: String) extends ServiceError
