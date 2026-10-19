package org.example.auth

import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import org.scalatestplus.junit.JUnitRunner
import org.junit.runner.RunWith

@RunWith(classOf[JUnitRunner])
class PasswordServiceSpec extends AnyFunSuite with Matchers {

  test("hashPassword should produce a valid bcrypt hash") {
    val password = "StrongPassword123!"
    val hash = PasswordService.hashPassword(password)
    hash should not be empty
    hash should startWith("$2a$")
  }

  test("verifyPassword should return true for matching password and hash") {
    val password = "SuperSecretPassword"
    val hash = PasswordService.hashPassword(password)
    PasswordService.verifyPassword(password, hash) shouldBe true
  }

  test("verifyPassword should return false for incorrect password") {
    val password = "SuperSecretPassword"
    val hash = PasswordService.hashPassword(password)
    PasswordService.verifyPassword("WrongPassword", hash) shouldBe false
  }

  test("verifyPassword should return false for null or empty inputs") {
    val hash = PasswordService.hashPassword("test")
    PasswordService.verifyPassword("", hash) shouldBe false
    PasswordService.verifyPassword(null, hash) shouldBe false
    PasswordService.verifyPassword("test", "") shouldBe false
    PasswordService.verifyPassword("test", null) shouldBe false
  }

  test("hashPassword should throw IllegalArgumentException for empty or null password") {
    an[IllegalArgumentException] should be thrownBy {
      PasswordService.hashPassword("")
    }
    an[IllegalArgumentException] should be thrownBy {
      PasswordService.hashPassword(null)
    }
  }
}
