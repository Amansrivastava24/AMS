package org.example.users

import org.example.auth.PasswordService
import org.example.common._

import scala.concurrent.{ExecutionContext, Future}

final class UserService(
    repository: UserRepository
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
      status = u.status
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
    repository.findById(id).map {
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
                          status = cleanStatus
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
    repository.findById(targetId).flatMap {
      case None =>
        Future.successful(Left(NotFoundError("User not found")))
      case Some((targetUser, targetRoleName, _)) =>
        // Admin cannot modify Admin or Super Admin
        if (callerRole == "ADMIN" && (targetRoleName == "ADMIN" || targetRoleName == "SUPER_ADMIN")) {
          Future.successful(Left(ForbiddenError("Admins cannot modify Admin or Super Admin accounts")))
        } else {
          val cleanName = req.name.map(_.trim).filter(_.nonEmpty)
          val cleanEmail = req.email.map(_.trim.toLowerCase).filter(_.nonEmpty)
          val cleanPassword = req.password.map(_.trim).filter(_.nonEmpty)

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
                      passwordHash = passwordHash
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
      status: String
  ): Future[Either[ServiceError, UserResponse]] = {
    val cleanStatus = Option(status).map(_.trim.toUpperCase).getOrElse("")
    if (cleanStatus != "ACTIVE" && cleanStatus != "INACTIVE") {
      Future.successful(Left(ValidationError("Status must be ACTIVE or INACTIVE")))
    } else {
      repository.findById(targetId).flatMap {
        case None =>
          Future.successful(Left(NotFoundError("User not found")))
        case Some((targetUser, targetRoleName, _)) =>
          if (callerRole == "ADMIN" && (targetRoleName == "ADMIN" || targetRoleName == "SUPER_ADMIN")) {
            Future.successful(Left(ForbiddenError("Admins cannot change status of Admin or Super Admin accounts")))
          } else if (cleanStatus == "INACTIVE" && targetRoleName == "SUPER_ADMIN") {
            repository.countActiveSuperAdmins().flatMap { activeSuperAdmins =>
              if (activeSuperAdmins <= 1) {
                Future.successful(Left(ConflictError("Cannot deactivate the last active Super Admin")))
              } else {
                repository.updateStatus(targetId, cleanStatus).flatMap(_ => getUser(targetId).map(_.toRight(NotFoundError("User not found"))))
              }
            }
          } else {
            repository.updateStatus(targetId, cleanStatus).flatMap(_ => getUser(targetId).map(_.toRight(NotFoundError("User not found"))))
          }
      }
    }
  }

  def updateRole(
      callerId: Long,
      callerRole: String,
      targetId: Long,
      roleId: Long
  ): Future[Either[ServiceError, UserResponse]] = {
    repository.getRoleById(roleId).flatMap {
      case None =>
        Future.successful(Left(ValidationError(s"Role ID $roleId does not exist")))
      case Some(newRole) =>
        repository.findById(targetId).flatMap {
          case None =>
            Future.successful(Left(NotFoundError("User not found")))
          case Some((targetUser, targetRoleName, _)) =>
            // Admin role constraints
            if (callerRole == "ADMIN") {
              if (targetRoleName == "ADMIN" || targetRoleName == "SUPER_ADMIN") {
                Future.successful(Left(ForbiddenError("Admins cannot change roles of Admin or Super Admin accounts")))
              } else if (newRole.name == "ADMIN" || newRole.name == "SUPER_ADMIN") {
                Future.successful(Left(ForbiddenError("Admins cannot grant privileged roles")))
              } else {
                repository.updateRole(targetId, roleId).flatMap(_ => getUser(targetId).map(_.toRight(NotFoundError("User not found"))))
              }
            } else if (callerRole == "SUPER_ADMIN") {
              // Super Admin constraints
              if (targetRoleName == "SUPER_ADMIN" && newRole.name != "SUPER_ADMIN") {
                if (targetId != callerId) {
                  Future.successful(Left(ForbiddenError("Super Admins cannot demote another Super Admin")))
                } else {
                  // Checking if this is the last Super Admin
                  repository.countActiveSuperAdmins().flatMap { activeSuperAdmins =>
                    if (activeSuperAdmins <= 1) {
                      Future.successful(Left(ConflictError("Cannot demote the last active Super Admin")))
                    } else {
                      repository.updateRole(targetId, roleId).flatMap(_ => getUser(targetId).map(_.toRight(NotFoundError("User not found"))))
                    }
                  }
                }
              } else {
                repository.updateRole(targetId, roleId).flatMap(_ => getUser(targetId).map(_.toRight(NotFoundError("User not found"))))
              }
            } else {
              Future.successful(Left(ForbiddenError("Insufficient permissions to change roles")))
            }
        }
    }
  }

  def deleteUser(
      callerId: Long,
      callerRole: String,
      targetId: Long
  ): Future[Either[ServiceError, Boolean]] = {
    repository.findById(targetId).flatMap {
      case None =>
        Future.successful(Left(NotFoundError("User not found")))
      case Some((targetUser, targetRoleName, _)) =>
        if (callerRole == "ADMIN" && (targetRoleName == "ADMIN" || targetRoleName == "SUPER_ADMIN")) {
          Future.successful(Left(ForbiddenError("Admins cannot delete Admin or Super Admin accounts")))
        } else if (callerRole == "SUPER_ADMIN" && targetRoleName == "SUPER_ADMIN" && targetId != callerId) {
          Future.successful(Left(ForbiddenError("Super Admins cannot delete another Super Admin")))
        } else if (targetRoleName == "SUPER_ADMIN") {
          repository.countActiveSuperAdmins().flatMap { activeSuperAdmins =>
            if (activeSuperAdmins <= 1) {
              Future.successful(Left(ConflictError("Cannot delete the last active Super Admin")))
            } else {
              proceedWithDelete(targetId)
            }
          }
        } else {
          proceedWithDelete(targetId)
        }
    }
  }

  private def proceedWithDelete(targetId: Long): Future[Either[ServiceError, Boolean]] = {
    repository.isReferencedInAssetsOrItems(targetId).flatMap { referenced =>
      if (referenced) {
        Future.successful(Left(ConflictError("Cannot delete user referenced as owner or custodian of assets/items; deactivate the account instead")))
      } else {
        repository.delete(targetId).map(_ => Right(true))
      }
    }
  }

  def listCustodians(): Future[Seq[UserResponse]] = repository.listCustodians()
}
