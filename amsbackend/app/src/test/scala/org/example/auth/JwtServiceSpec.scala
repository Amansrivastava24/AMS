package org.example.auth

import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.junit.JUnitRunner
import org.junit.runner.RunWith

@RunWith(classOf[JUnitRunner])
class JwtServiceSpec extends AnyFunSuite with Matchers {

  test("generateToken and validateToken should round-trip claims correctly") {
    val token = JwtService.generateToken(userId = 42L, email = "admin@example.com", role = "ADMIN")
    token should not be empty

    val claimsOpt = JwtService.validateToken(token)
    claimsOpt shouldBe defined

    val claims = claimsOpt.get
    claims.getSubject shouldBe "42"
    claims.get("email", classOf[String]) shouldBe "admin@example.com"
    claims.get("role", classOf[String]) shouldBe "ADMIN"
  }

  test("validateToken should return None for malformed token") {
    JwtService.validateToken("invalid.token.string") shouldBe None
    JwtService.validateToken("") shouldBe None
    JwtService.validateToken(null) shouldBe None
  }

  test("validateToken should return None for tampered token") {
    val token = JwtService.generateToken(userId = 1L, email = "user@example.com", role = "GENERAL")
    val tampered = token + "xyz"
    JwtService.validateToken(tampered) shouldBe None
  }
}
