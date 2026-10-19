
package org.example.auth

import at.favre.lib.crypto.bcrypt.BCrypt

object PasswordService {

  private val CostFactor = 12

  def hashPassword(password: String): String = {
    require(
      password != null && password.nonEmpty,
      "Password must not be empty"
    )

    BCrypt.withDefaults()
      .hashToString(CostFactor, password.toCharArray)
  }

  def verifyPassword(
      password: String,
      passwordHash: String
  ): Boolean = {
    if (
      password == null ||
      passwordHash == null ||
      password.isEmpty ||
      passwordHash.isEmpty
    ) {
      false
    } else {
      BCrypt.verifyer()
        .verify(password.toCharArray, passwordHash)
        .verified
    }
  }
}
