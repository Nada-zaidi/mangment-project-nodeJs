import TenantRepository from '../Controller/tenantController';
import TenantUserRepository from '../Controller/tenantUserController';
import MongooseRepository from '../Controller/mongooseController';
import PermissionChecker from './user/permissionChecker';
import Permissions from '../security/permissions';
import { getConfig } from '../config';
import Roles from '../security/roles';
import UserRepository from '../Controller/userController';
import { IServiceOptions } from './IServiceOptions';

export default class TenantService {
  options: IServiceOptions;

  constructor(options) {
    this.options = options;
  }

  /**
   * Creates the default tenant or joins the default with
   * roles passed.
   * If default roles are empty, the admin will have to asign the roles
   * to new users.
   */
  async createOrJoinDefault({ roles }, session) {
    const tenant = await TenantRepository.findDefault({
      ...this.options,
      session,
    });

    if (tenant) {
      // Reload the current user in case it has chenged
      // in the middle of this session
      const currentUserReloaded = await UserRepository.findById(
        this.options.currentUser.id,
        {
          ...this.options,
          bypassPermissionValidation: true,
          session,
        },
      );

      const tenantUser = currentUserReloaded.tenants.find(
        (userTenant) => {
          return userTenant.tenant.id === tenant.id;
        },
      );

      // In this situation, the user has used the invitation token
      // and it is already part of the tenant
      if (tenantUser) {
        return;
      }

      return await TenantUserRepository.create(
        tenant,
        this.options.currentUser,
        roles,
        { ...this.options, session },
      );
    }

    let record = await TenantRepository.create(
      { name: 'default', url: 'default' },
      {
        ...this.options,
        session,
      },
    );


    await TenantUserRepository.create(
      record,
      this.options.currentUser,
      [Roles.values.admin],
      {
        ...this.options,
        session,
      },
    );
  }

  async joinWithDefaultRolesOrAskApproval(
    { roles, tenantId },
    { session },
  ) {
    const tenant = await TenantRepository.findById(
      tenantId,
      {
        ...this.options,
        session,
      },
    );

    if (!tenant) {
      return;
    }

    // Reload the current user in case it has chenged
    // in the middle of this session
    const currentUserReloaded = await UserRepository.findById(
      this.options.currentUser.id,
      {
        ...this.options,
        bypassPermissionValidation: true,
        session,
      },
    );

    const tenantUser = currentUserReloaded.tenants.find(
      (userTenant) => {
        return userTenant.tenant.id === tenant.id;
      },
    );

    if (tenantUser) {
      // If found the invited tenant user via email
      // accepts the invitation
      if (tenantUser.status === 'invited') {
        return await TenantUserRepository.acceptInvitation(
          tenantUser.invitationToken,
          {
            ...this.options,
            session,
          },
        );
      }

      // In this case the tenant user already exists
      // and it's accepted or with empty permissions
      return;
    }

    return await TenantUserRepository.create(
      tenant,
      this.options.currentUser,
      roles,
      { ...this.options, session },
    );
  }

  // In case this user has been invited
  // but havent used the invitation token
  async joinDefaultUsingInvitedEmail(session) {
    const tenant = await TenantRepository.findDefault({
      ...this.options,
      session,
    });

    if (!tenant) {
      return;
    }

    // Reload the current user in case it has chenged
    // in the middle of this session
    const currentUserReloaded = await UserRepository.findById(
      this.options.currentUser.id,
      {
        ...this.options,
        bypassPermissionValidation: true,
        session,
      },
    );

    const tenantUser = currentUserReloaded.tenants.find(
      (userTenant) => {
        return userTenant.tenant.id === tenant.id;
      },
    );

    if (!tenantUser || tenantUser.status !== 'invited') {
      return;
    }

    return await TenantUserRepository.acceptInvitation(
      tenantUser.invitationToken,
      {
        ...this.options,
        session,
      },
    );
  }
  
  async findById(id, options?) {
    options = options || {};

    return TenantRepository.findById(id, {
      ...this.options,
      ...options,
    });
  } 
    //options = options || {}; 
  
  async findAllAutocomplete(search, limit) {
    return TenantRepository.findAllAutocomplete(
      search,
      limit,
      this.options,
    );
  }

 /* async import(data, importHash) {
    if (!importHash) {
      throw new Error('import Hash Required');
    }

    if (await this._isImportHashExistent(importHash)) {
      throw new Error('import Hash Existent');
    }

    const dataToCreate = {
      ...data,
      importHash,
    };

    return this.create(dataToCreate);
  }*/

  async _isImportHashExistent(importHash) {
    const count = await TenantRepository.count(
      {
        importHash,
      },
      this.options,
    );

    return count > 0;
  }
}
