#!/usr/bin/env bun

import { PermissionService, RoleService } from 'najm-auth';
import { runSeedTask } from '../shared/run-seed';
import permissionsData from './data/permissions.json';
import rolePermissionsData from './data/rolePermissions.json';
import rolesData from './data/roles.json';

// Bring an existing database up to the default roles and grants. Additive only:
// missing roles, permissions and grants are created, nothing is removed, and no
// account or password is touched, so grants edited in the dashboard survive.
await runSeedTask('role permissions', async (server) => {
  const roleService = await server.container.resolve(RoleService);
  const permissionService = await server.container.resolve(PermissionService);

  const createdRoles = await roleService.seedDefaultRoles(rolesData);
  console.log(`✅ Roles: ${createdRoles.length} created`);

  const permissions = await permissionService.seedDefaultPermissions(permissionsData);
  console.log(`✅ Permissions: ${permissions.created.length} created`);

  const grants = await permissionService.seedDefaultRolePermissions(rolePermissionsData);
  console.log(`✅ Grants: ${grants.assigned.length} assigned`);
});
