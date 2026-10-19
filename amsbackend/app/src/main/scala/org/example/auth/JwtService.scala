
package org.example.auth

import io.jsonwebtoken.{Claims, Jwts}
import io.jsonwebtoken.security.Keys

import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.Date
import javax.crypto.SecretKey

object JwtService {

  private val ExpirationMillis = 60L * 60L * 1000L

  private val config = com.typesafe.config.ConfigFactory.load()

  private lazy val secretKey: SecretKey = {
    val secret = sys.env.get("JWT_SECRET")
      .orElse(if (config.hasPath("jwt.secret")) Some(config.getString("jwt.secret")) else None)
      .getOrElse(
        throw new IllegalStateException(
          "JWT_SECRET environment variable is not configured"
        )
      )

    val bytes = secret.getBytes(StandardCharsets.UTF_8)

    require(
      bytes.length >= 32,
      "JWT_SECRET must contain at least 32 bytes"
    )

    Keys.hmacShaKeyFor(bytes)
  }

  def generateToken(
      userId: Long,
      email: String,
      role: String
  ): String = {
    val now = Instant.now()
    val expiration = now.plusMillis(ExpirationMillis)

    Jwts.builder()
      .subject(userId.toString)
      .claim("email", email)
      .claim("role", role)
      .issuedAt(Date.from(now))
      .expiration(Date.from(expiration))
      .signWith(secretKey)
      .compact()
  }

  def validateToken(token: String): Option[Claims] = {
    if (token == null || token.trim.isEmpty) {
      None
    } else {
      try {
        val claims = Jwts.parser()
          .verifyWith(secretKey)
          .build()
          .parseSignedClaims(token)
          .getPayload

        Some(claims)
      } catch {
        case _: Exception => None
      }
    }
  }
}