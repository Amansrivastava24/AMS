/**
 * Role-Based Access Control definitions (UI Presentation Layer)
 * 
 * Note: These checks govern UI presentation only. 
 * Real authorization MUST be enforced by the backend API.
 */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CUSTODIAN: 'CUSTODIAN',
  GENERAL: 'GENERAL',
};

export const PERMISSIONS = {
  // Physical Asset permissions
  VIEW_INVENTORY: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CUSTODIAN, ROLES.GENERAL],
  EXPORT_INVENTORY: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CUSTODIAN, ROLES.GENERAL],
  VIEW_ASSETS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CUSTODIAN, ROLES.GENERAL],
  CREATE_ASSET: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  EDIT_ASSET: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CUSTODIAN],
  UPDATE_VERIFICATION: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CUSTODIAN],
  DELETE_ASSET: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // User Management permissions
  VIEW_USERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  CREATE_USER: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  EDIT_USER: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  DEACTIVATE_USER: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  CHANGE_ROLE: [ROLES.SUPER_ADMIN],
  DELETE_USER: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Reference Data permissions
  VIEW_REFERENCE_DATA: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CUSTODIAN, ROLES.GENERAL],
  MANAGE_REFERENCE_DATA: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role, permission) {
  if (!role || !PERMISSIONS[permission]) return false;
  return PERMISSIONS[permission].includes(role);
}

/**
 * Check if the actor can modify or delete a target user
 */
export function canManageTargetUser(actorRole, targetRole, actorId, targetId) {
  if (actorRole === ROLES.SUPER_ADMIN) {
    return true;
  }
  if (actorRole === ROLES.ADMIN) {
    // Admin cannot modify, demote or delete other Admin or Super Admin
    return targetRole === ROLES.GENERAL || targetRole === ROLES.CUSTODIAN;
  }
  return false;
}
