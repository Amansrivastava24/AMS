package org.example.auth

final case class LoginRequest(
    employeeIdOrEmail: String,
    password: String
)

final case class AuthUserDto(
    id: Long,
    employeeId: String,
    name: String,
    email: String,
    role: String,
    city: Option[String] = None,
    country: Option[String] = None
)

final case class LoginResponse(
    accessToken: String,
    tokenType: String = "Bearer",
    expiresIn: Long = 3600,
    user: AuthUserDto
)