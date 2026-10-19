package org.example.common

import com.fasterxml.jackson.databind.{DeserializationFeature, ObjectMapper, SerializationFeature}
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.scala.DefaultScalaModule
import org.apache.pekko.http.scaladsl.model._

import scala.util.{Failure, Success, Try}

case class ApiError(code: String, message: String, details: Seq[String] = Nil)
case class ApiErrorResponse(error: ApiError)

object JsonSupport {

  val mapper: ObjectMapper = new ObjectMapper()
    .registerModule(DefaultScalaModule)
    .registerModule(new JavaTimeModule())
    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
    .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)

  def toJson(value: Any): String =
    mapper.writeValueAsString(value)

  def toJsonBytes(value: Any): Array[Byte] =
    mapper.writeValueAsBytes(value)

  def fromJson[T](json: String)(implicit m: Manifest[T]): Try[T] =
    Try(mapper.readValue[T](json, mapper.constructType(m.runtimeClass)))

  def jsonResponse(status: StatusCode, value: Any): HttpResponse =
    HttpResponse(
      status = status,
      entity = HttpEntity(ContentTypes.`application/json`, toJson(value))
    )

  def errorResponse(status: StatusCode, code: String, message: String, details: Seq[String] = Nil): HttpResponse =
    jsonResponse(
      status,
      Map("error" -> message, "code" -> code, "details" -> details)
    )

  def simpleError(status: StatusCode, message: String): HttpResponse =
    jsonResponse(status, Map("error" -> message))

  def handleServiceError(err: ServiceError): HttpResponse = err match {
    case ValidationError(msg) => simpleError(StatusCodes.BadRequest, msg)
    case ConflictError(msg)   => simpleError(StatusCodes.Conflict, msg)
    case NotFoundError(msg)   => simpleError(StatusCodes.NotFound, msg)
    case ForbiddenError(msg)  => simpleError(StatusCodes.Forbidden, msg)
  }
}
