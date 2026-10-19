package org.example.auth

object HashPasswordUtil {
  def main(args: Array[String]): Unit = {
    val pwd = if (args.nonEmpty && args(0).nonEmpty) {
      args(0)
    } else {
      val console = System.console()
      if (console != null) {
        val chars = console.readPassword("Enter password to hash: ")
        if (chars != null) new String(chars) else ""
      } else {
        scala.io.StdIn.readLine("Enter password to hash: ")
      }
    }

    if (pwd == null || pwd.trim.isEmpty) {
      System.err.println("Error: Password cannot be empty.")
      System.exit(1)
    } else {
      val hash = PasswordService.hashPassword(pwd.trim)
      println(s"Generated BCrypt Hash (Cost Factor 12):")
      println(hash)
    }
  }
}
