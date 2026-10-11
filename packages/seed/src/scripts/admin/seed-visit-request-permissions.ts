import { PermissionService, RoleService } from 'najm-auth';
import { runSeedTask } from '../shared/run-seed';
import permissions from './data/permissions.json';

// Add only this feature's grants. No account/password updates or grant removal.
await runSeedTask('visit request permissions', async server => {
  const service = await server.container.resolve(PermissionService);
  const roles = await server.container.resolve(RoleService);
  for (const input of permissions.filter(item => item.resource === 'visit-requests')) {
    const permission = await service.getByName(input.name) ?? await service.create(input);
    for (const name of ['admin', 'principal', 'secretary']) {
      const role = await roles.getByName(name);
      if (!role) continue;
      const existing = await service.getPermissionsByRole(role.id);
      if (existing.some(item => item.name === input.name)) continue;
      await service.assignPermissionToRole(role.id, permission.id);
    }
  }
});
