package org.example.users

import org.example.auth.PasswordService
import org.example.common._

import scala.concurrent.{ExecutionContext, Future}

final class UserService(
    val repository: UserRepository
)(implicit executionContext: ExecutionContext) {

  private def toUserResponse(u: User, roleName: String, deptName: Option[String]): UserResponse =
    UserResponse(
      id = u.id,
      employeeId = u.employeeId,
      name = u.name,
      email = u.email,
      role = roleName,
      roleId = u.roleId,
      departmentId = u.departmentId,
      departmentName = deptName,
      status = u.status,
      city = u.city,
      country = u.country
    )

  def listUsers(
      page: Int,
      pageSize: Int,
      search: Option[String],
      employeeId: Option[String],
      email: Option[String],
      roleName: Option[String],
      departmentId: Option[Long],
      status: Option[String]
  ): Future[UserPage] =
    repository.findAll(page, pageSize, search, employeeId, email, roleName, departmentId, status)

  def getUser(id: Long): Future[Option[UserResponse]] =
    repository.findUserDetailsById(id).map {
      case Some((u, roleName, deptName)) => Some(toUserResponse(u, roleName, deptName))
      case None => None
    }

  def listRoles(): Future[Seq[Role]] =
    repository.listRoles()

  def createUser(
      callerRole: String,
      req: CreateUserRequest
  ): Future[Either[ServiceError, UserResponse]] = {
    val cleanEmpId = Option(req.employeeId).map(_.trim).getOrElse("")
    val cleanName = Option(req.name).map(_.trim).getOrElse("")
    val cleanEmail = Option(req.email).map(_.trim.toLowerCase).getOrElse("")
    val cleanPassword = Option(req.password).map(_.trim).getOrElse("")
    val cleanStatus = req.status.map(_.trim.toUpperCase).getOrElse("ACTIVE")
    val cleanCity = req.city.map(_.trim).filter(_.nonEmpty)
    val cleanCountry = req.country.map(_.trim).filter(_.nonEmpty)

    if (cleanEmpId.isEmpty) Future.successful(Left(ValidationError("Employee ID is required")))
    else if (cleanName.isEmpty) Future.successful(Left(ValidationError("Name is required")))
    else if (cleanEmail.isEmpty || !cleanEmail.contains("@")) Future.successful(Left(ValidationError("Valid email is required")))
    else if (cleanPassword.length < 6) Future.successful(Left(ValidationError("Password must contain at least 6 characters")))
    else if (cleanStatus != "ACTIVE" && cleanStatus != "INACTIVE") Future.successful(Left(ValidationError("Status must be ACTIVE or INACTIVE")))
    else {
      repository.getRoleById(req.cleanRoleId).flatMap {
        case None =>
          Future.successful(Left(ValidationError(s"Role ID ${req.cleanRoleId} does not exist")))
        case Some(role) =>
          // Role authorization check
          if (callerRole != "SUPER_ADMIN" && (role.name == "SUPER_ADMIN" || role.name == "ADMIN")) {
            Future.successful(Left(ForbiddenError("Only Super Admins can create Admin or Super Admin accounts")))
          } else {
            // Check department if provided
            val deptCheck = req.cleanDepartmentId match {
              case Some(dId) => repository.isDepartmentValid(dId)
              case None => Future.successful(true)
            }

            deptCheck.flatMap { validDept =>
              if (!validDept) {
                Future.successful(Left(ValidationError(s"Department ID ${req.cleanDepartmentId.get} does not exist")))
              } else {
                // Check unique employeeId and email
                repository.findByEmployeeId(cleanEmpId).flatMap {
                  case Some(_) =>
                    Future.successful(Left(ConflictError(s"User with employee ID '$cleanEmpId' already exists")))
                  case None =>
                    repository.findByEmail(cleanEmail).flatMap {
                      case Some(_) =>
                        Future.successful(Left(ConflictError(s"User with email '$cleanEmail' already exists")))
                      case None =>
                        val passwordHash = PasswordService.hashPassword(cleanPassword)
                        val newUser = User(
                          id = 0L,
                          employeeId = cleanEmpId,
                          name = cleanName,
                          email = cleanEmail,
                          passwordHash = passwordHash,
                          roleId = role.id,
                          departmentId = req.cleanDepartmentId,
                          status = cleanStatus,
                          city = cleanCity,
                          country = cleanCountry
                        )
                        repository.create(newUser).flatMap { created =>
                          getUser(created.id).map {
                            case Some(resp) => Right(resp)
                            case None => Right(toUserResponse(created, role.name, None))
                          }
                        }
                    }
                }
              }
            }
          }
      }
    }
  }

  def updateUser(
      callerId: Long,
      callerRole: String,
      targetId: Long,
      req: UpdateUserRequest
  ): Future[Either[ServiceError, UserResponse]] = {
    repository.findUserDetailsById(targetId).flatMap {
      case None =>
        Future.successful(Left(NotFoundError("User not found")))
      case Some((targetUser, targetRoleName, _)) =>
        // Admin cannot modify other Admin or Super Admin
        if (callerRole == "ADMIN" && callerId != targetId && (targetRoleName == "ADMIN" || targetRoleName == "SUPER_ADMIN")) {
          Future.successful(Left(ForbiddenError("Admins cannot modify other Admin or Super Admin accounts")))
        } else {
          val cleanName = req.name.map(_.trim).filter(_.nonEmpty)
          val cleanEmail = req.email.map(_.trim.toLowerCase).filter(_.nonEmpty)
          val cleanPassword = req.password.map(_.trim).filter(_.nonEmpty)
          val cityUpdate = if (req.city.isDefined) Some(req.city.map(_.trim).filter(_.nonEmpty)) else None
          val countryUpdate = if (req.country.isDefined) Some(req.country.map(_.trim).filter(_.nonEmpty)) else None

          if (req.name.isDefined && cleanName.isEmpty) {
            Future.successful(Left(ValidationError("Name must not be empty")))
          } else if (cleanEmail.isDefined && !cleanEmail.get.contains("@")) {
            Future.successful(Left(ValidationError("Valid email is required")))
          } else if (cleanPassword.isDefined && cleanPassword.get.length < 6) {
            Future.successful(Left(ValidationError("Password must contain at least 6 characters")))
          } else {
            // Check email uniqueness if changed
            val emailCheck = cleanEmail match {
              case Some(newEmail) if newEmail != targetUser.email.toLowerCase =>
                repository.findByEmail(newEmail).map(_.exists(_.id != targetId))
              case _ =>
                Future.successful(false)
            }

            emailCheck.flatMap { emailExists =>
              if (emailExists) {
                Future.successful(Left(ConflictError(s"User with email '${cleanEmail.get}' already exists")))
              } else {
                // Check department validity if changed
                val cleanDeptOpt = req.cleanDepartmentId
                val deptCheck = cleanDeptOpt match {
                  case Some(Some(dId)) => repository.isDepartmentValid(dId)
                  case _ => Future.successful(true)
                }

                deptCheck.flatMap { validDept =>
                  if (!validDept) {
                    Future.successful(Left(ValidationError(s"Department ID ${cleanDeptOpt.get.get} does not exist")))
                  } else {
                    val passwordHash = cleanPassword.map(PasswordService.hashPassword)
                    val deptUpdate = cleanDeptOpt

                    repository.updateDetails(
                      id = targetId,
                      name = cleanName,
                      email = cleanEmail,
                      departmentId = deptUpdate,
                      passwordHash = passwordHash,
                      city = cityUpdate,
                      country = countryUpdate
                    ).flatMap {
                      case Some(_) =>
                        getUser(targetId).map {
                          case Some(resp) => Right(resp)
                          case None => Left(NotFoundError("User not found"))
                        }
                      case None =>
                        Future.successful(Left(NotFoundError("User not found")))
                    }
                  }
                }
              }
            }
          }
        }
    }
  }

  def updateStatus(
      callerId: Long,
      callerRole: String,
      targetId: Long,
      newStatus: String
  ): Future[Either[ServiceError, UserResponse]] = {
    val cleanStatus = Option(newStatus).map(_.trim.toUpperCase).getOrElse("")
    if (cleanStatus != "ACTIVE" && cleanStatus != "INACTIVE") {
      Future.successful(Left(ValidationError("Status must be ACTIVE or INACTIVE")))
    } else {
      repository.findUserDetailsById(targetId).flatMap {
        case None =>
          Future.successful(Left(NotFoundError("User not found")))
        case Some((targetUser, targetRoleName, _)) =>
          if (callerRole == "ADMIN" && (targetRoleName == "ADMIN" || targetRoleName == "SUPER_ADMIN")) {
            Future.successful(Left(ForbiddenError("Admins cannot change status of Admin or Super Admin accounts")))
          } else {
            val lastSuperAdminCheck =
              if (targetRoleName == "SUPER_ADMIN" && cleanStatus == "INACTIVE" && targetUser.status == "ACTIVE") {
                repository.countActiveSuperAdmins().map(_ <= 1)
              } else {
                Future.successful(false)
              }

            lastSuperAdminCheck.flatMap { isLast =>
              if (isLast) {
                Future.successful(Left(ConflictError("Cannot deactivate the last active Super Admin account")))
              } else {
                repository.updateStatus(targetId, cleanStatus).flatMap {
                  case 0 => Future.successful(Left(NotFoundError("User not found")))
                  case _ =>
                    getUser(targetId).map {
                      case Some(resp) => Right(resp)
                      case None => Left(NotFoundError("User not found"))
                    }
                }
              }
            }
          }
      }
    }
  }

  def updateRole(
      callerId: Long,
      callerRole: String,
      targetId: Long,
      newRoleId: Long
  ): Future[Either[ServiceError, UserResponse]] = {
    if (callerRole != "SUPER_ADMIN") {
      Future.successful(Left(ForbiddenError("Only Super Admins can change user roles")))
    } else {
      repository.getRoleById(newRoleId).flatMap {
        case None =>
          Future.successful(Left(ValidationError(s"Role ID $newRoleId does not exist")))
        case Some(targetRole) =>
          repository.findUserDetailsById(targetId).flatMap {
            case None =>
              Future.successful(Left(NotFoundError("User not found")))
            case Some((targetUser, currentRoleName, _)) =>
              val demotingLastSuperAdminCheck =
                if (currentRoleName == "SUPER_ADMIN" && targetRole.name != "SUPER_ADMIN" && targetUser.status == "ACTIVE") {
                  repository.countActiveSuperAdmins().map(_ <= 1)
                } else {
                  Future.successful(false)
                }

              demotingLastSuperAdminCheck.flatMap { isLast =>
                if (isLast) {
                  Future.successful(Left(ConflictError("Cannot change role of the last active Super Admin account")))
                } else {
                  repository.updateRole(targetId, newRoleId).flatMap {
                    case 0 => Future.successful(Left(NotFoundError("User not found")))
                    case _ =>
                      getUser(targetId).map {
                        case Some(resp) => Right(resp)
                        case None => Left(NotFoundError("User not found"))
                      }
                  }
                }
              }
          }
      }
    }
  }

  def deleteUser(
      callerId: Long,
      callerRole: String,
      targetId: Long
  ): Future[Either[ServiceError, Boolean]] = {
    repository.findUserDetailsById(targetId).flatMap {
      case None =>
        Future.successful(Left(NotFoundError("User not found")))
      case Some((targetUser, targetRoleName, _)) =>
        if (callerRole == "ADMIN" && (targetRoleName == "ADMIN" || targetRoleName == "SUPER_ADMIN")) {
          Future.successful(Left(ForbiddenError("Admins cannot delete Admin or Super Admin accounts")))
        } else {
          val lastSuperAdminCheck =
            if (targetRoleName == "SUPER_ADMIN" && targetUser.status == "ACTIVE") {
              repository.countActiveSuperAdmins().map(_ <= 1)
            } else {
              Future.successful(false)
            }

          lastSuperAdminCheck.flatMap { isLast =>
            if (isLast) {
              Future.successful(Left(ConflictError("Cannot delete the last active Super Admin account")))
            } else {
              repository.isReferencedInAssetsOrItems(targetId).flatMap { isReferenced =>
                if (isReferenced) {
                  Future.successful(Left(ConflictError("Cannot delete user because they are assigned as an owner or custodian for existing assets")))
                } else {
                  repository.delete(targetId).map {
                    case 0 => Left(NotFoundError("User not found"))
                    case _ => Right(true)
                  }
                }
              }
            }
          }
        }
    }
  }

  def listCustodians(): Future[Seq[UserResponse]] =
    repository.listCustodians()
}
