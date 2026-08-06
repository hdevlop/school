#!/usr/bin/env bun

import { RoleService, PermissionService, UserService } from 'najm-auth';
import permissionsData from './data/permissions.json';
import rolePermissionsData from './data/rolePermissions.json';
import rolesData from './data/roles.json';
import { runSeedTask } from '../shared/run-seed';

runSeedTask('admin seed', async (server) => {
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

  const email = process.env.ADMIN_EMAIL || 'admin@admin.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123456';
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
