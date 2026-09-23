#!/usr/bin/env bun

import permissionsData from './data/permissions.json';
import rolePermissionsData from './data/rolePermissions.json';
import rolesData from './data/roles.json';
import { readAdminSeedCredentials } from './adminSeedPrompt';

// Validate before initializing the server or writing any roles or permissions.
const credentials = await readAdminSeedCredentials();
if (!credentials) process.exit(0);
const { email, password } = credentials;
const [{ RoleService, PermissionService, UserService }, { runSeedTask }] = await Promise.all([
  import('najm-auth'),
  import('../shared/run-seed'),
]);

await runSeedTask('admin seed', async (server) => {
  const roleService = await server.container.resolve(RoleService);
  const permissionService = await server.container.resolve(PermissionService);
  const userService = await server.container.resolve(UserService);

  console.log('🌱 Seeding admin data...');

  await roleService.seedDefaultRoles(rolesData);
  console.log('✅ Roles seeded');

  await permissionService.seedDefaultPermissions(permissionsData);
  console.log('✅ Permissions seeded');

  await permissionService.seedDefaultRolePermissions(rolePermissionsData);
  console.log('✅ Role permissions assigned');

  const existingAdmin = await userService.findByEmail(email);

  if (existingAdmin) {
    const adminRole = await roleService.getByName('admin');
    if (!adminRole) throw new Error('Admin role was not created');

    await userService.update(existingAdmin.id, {
      name: existingAdmin.name || 'System Administrator',
      email,
      password,
      roleId: adminRole.id,
      status: 'active',
      emailVerified: true,
    });
    console.log('✅ Existing admin user updated');
  } else {
    await userService.seedAdminUser({ email, password });
    console.log('✅ Admin user created');
  }

  console.log('\n✨ Admin data seeded successfully!');
});
