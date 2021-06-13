import assert from 'assert';
import Permissions from '../../security/permissions';

/**
 * Checks the Permission of the User on a Tenant.
 */
export default class PermissionChecker {
  currentTenant;
  currentUser;

  constructor({ currentTenant, currentUser }) {
    this.currentTenant = currentTenant;
    this.currentUser = currentUser;
  }

  /**
   * Validates if the user has a specific permission
   * and throws a Error if it doesn't.   
   */
  validateHas(permission) {
    if (!this.has(permission)) {
      throw new Error("no permission");
    }
    return this.has(permission)
  }

  /**
   * Checks if the user has a specific permission.
   */
  has(permission) {
    assert(permission, 'permission is required');

    if (!this.isEmailVerified) {
      return false;
    }

    return this.hasRolePermission(permission);
  }


  /**
   * Checks if the current user roles allows the permission.
   */
  hasRolePermission(permission) {
    return this.currentUserRolesIds.some((role) =>
      permission.allowedRoles.some(
        (allowedRole) => allowedRole === role,
      ),
    );
  }
  get isEmailVerified() {
    // Only checks if the email is verified
    // if the email system is on
    /*if (!EmailSender.isConfigured) {
      return true;
    }*/

    return true;
  }

  /**
   * Returns the Current User Roles.
   */
  get currentUserRolesIds() {
    if (!this.currentUser || !this.currentUser.tenants) {
      return [];
    }

    const tenant = this.currentUser.tenants
      .filter(
        (tenantUser) => tenantUser.status === 'active',
      )
      .find((tenantUser) => {
        return (
          tenantUser.tenant.id === this.currentTenant.id
        );
      });

    if (!tenant) {
      return [];
    }

    return tenant.roles;
  }

  
}
