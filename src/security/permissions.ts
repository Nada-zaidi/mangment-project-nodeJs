import Roles from './roles';
const roles = Roles.values;

class Permissions {
  static get values() {
    return {
      tenantEdit: {
        id: 'tenantEdit',
        allowedRoles: [roles.admin],
       
      },
      tenantDestroy: {
        id: 'tenantDestroy',
        allowedRoles: [roles.admin],
       
      },
      userEdit: {
        id: 'userEdit',
        allowedRoles: [roles.admin],
       
      },
      userDestroy: {
        id: 'userDestroy',
        allowedRoles: [roles.admin],
       
      },
      userCreate: {
        id: 'userCreate',
        allowedRoles: [roles.admin],
       
      },
      userImport: {
        id: 'userImport',
        allowedRoles: [roles.admin],
       
      },
      userRead: {
        id: 'userRead',
        allowedRoles: [roles.admin],
       
      },
      userAutocomplete: {
        id: 'userAutocomplete',
        allowedRoles: [roles.admin, roles.custom],
       
      },
      auditLogRead: {
        id: 'auditLogRead',
        allowedRoles: [roles.admin],
       
      },
      settingsEdit: {
        id: 'settingsEdit',
        allowedRoles: [roles.admin],
       
        
      },
      projectImport: {
        id: 'projectImport',
        allowedRoles: [roles.admin],
        
      },
      projectCreate: {
        id: 'projectCreate',
        allowedRoles: [roles.admin],
        
        
      },
      projectEdit: {
        id: 'projectEdit',
        allowedRoles: [roles.admin],
        
        
      },
      projectDestroy: {
        id: 'projectDestroy',
        allowedRoles: [roles.admin],
        
        
      },
      projectRead: {
        id: 'projectRead',
        allowedRoles: [roles.admin, roles.custom],
        
      },
      projectAutocomplete: {
        id: 'projectAutocomplete',
        allowedRoles: [roles.admin, roles.custom],
        
      },

      taskImport: {
        id: 'taskImport',
        allowedRoles: [roles.admin],
        
      },
      taskCreate: {
        id: 'taskCreate',
        allowedRoles: [roles.admin],
        
        
      },
      taskEdit: {
        id: 'taskEdit',
        allowedRoles: [roles.admin],
        
        
      },
      taskDestroy: {
        id: 'taskDestroy',
        allowedRoles: [roles.admin],
        
        
      },
      taskRead: {
        id: 'taskRead',
        allowedRoles: [roles.admin, roles.custom],
        
      },
      taskAutocomplete: {
        id: 'taskAutocomplete',
        allowedRoles: [roles.admin, roles.custom],
        
      },      
    };
  }

  static get asArray() {
    return Object.keys(this.values).map((value) => {
      return this.values[value];
    });
  }
}

export default Permissions;
