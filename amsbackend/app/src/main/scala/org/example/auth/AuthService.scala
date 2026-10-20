package org.example.auth

import org.example.db.Database
import slick.jdbc.GetResult
import slick.jdbc.PostgresProfile.api._

import scala.concurrent.{ExecutionContext, Future}
import scala.util.control.NonFatal

object AuthService {

  final case class AuthenticatedUser(
      id: Long,
      employeeId: String,
      name: String,
      email: String,
      passwordHash: String,
      role: String,
      status: String,
      city: Option[String],
      country: Option[String]
  )

  implicit private val userResult: GetResult[AuthenticatedUser] =
    GetResult { r =>
      AuthenticatedUser(
        id = r.nextLong(),
        employeeId = r.nextString(),
        name = r.nextString(),
        email = r.nextString(),
        passwordHash = r.nextString(),
        role = r.nextString(),
        status = r.nextString(),
        city = r.nextStringOption(),
        country = r.nextStringOption()
      )
    }

  def login(
      request: LoginRequest
  )(implicit ec: ExecutionContext): Future[Either[String, LoginResponse]] = {

    val identifier =
      Option(request.employeeIdOrEmail).map(_.trim).getOrElse("")

    val password = request.password

    if (identifier.isEmpty || password == null || password.isEmpty) {
      Future.successful(Left("Employee ID/email and password are required"))
    } else {
      val userQuery = sql"""
        SELECT u.id, u.employee_id, u.name, u.email, u.password_hash, r.name, u.status, u.city, u.country
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.employee_id = $identifier
           OR LOWER(u.email) = LOWER($identifier)
        LIMIT 1
      """.as[AuthenticatedUser].headOption

      Database.slickDatabase.run(userQuery).flatMap {
        case None =>
          Future.successful(Left("Invalid credentials"))

        case Some(user) if !user.status.equalsIgnoreCase("ACTIVE") =>
          Future.successful(Left("Account is inactive"))

        case Some(user)
            if !PasswordService.verifyPassword(password, user.passwordHash) =>
          Future.successful(Left("Invalid credentials"))

        case Some(user) =>
          try {
            val token = JwtService.generateToken(
              userId = user.id,
              email = user.email,
              role = user.role
            )
            val response = LoginResponse(
              accessToken = token,
              tokenType = "Bearer",
              expiresIn = 3600L,
              user = AuthUserDto(
                id = user.id,
                employeeId = user.employeeId,
                name = user.name,
                email = user.email,
                role = user.role,
                city = user.city,
                country = user.country
              )
            )
            Future.successful(Right(response))
          } catch {
            case NonFatal(_) =>
              Future.successful(Left("Authentication service unavailable"))
          }
      }.recover {
        case NonFatal(_) =>
          Left("Authentication service unavailable")
      }
    }
  }
}
