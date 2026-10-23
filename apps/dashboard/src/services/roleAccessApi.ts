import type { RoleAccessSnapshot, SaveRoleAccess } from '@sms/contracts/access-control';
import { api } from './http';

function snapshot(body: RoleAccessSnapshot | { data: RoleAccessSnapshot }): RoleAccessSnapshot {
  return 'data' in body ? body.data : body;
}
export async function getRoleAccessApi(roleId: string): Promise<RoleAccessSnapshot> {
  return snapshot((await api.get(`/admin/access/roles/${encodeURIComponent(roleId)}`)).data);
}
export async function saveRoleAccessApi(roleId: string, body: SaveRoleAccess): Promise<RoleAccessSnapshot> {
  return snapshot((await api.put(`/admin/access/roles/${encodeURIComponent(roleId)}`, body)).data);
}
