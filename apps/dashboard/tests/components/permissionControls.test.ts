import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { matchPermission } from 'najm-auth/client';
import { canPerformAction, protectMenuItems } from '@/shared/actionPermissions';
const rolePermissions: Array<{ roleName: string; permissions: string[] }> = JSON.parse(readFileSync(new URL('../../../../packages/seed/src/scripts/admin/data/rolePermissions.json', import.meta.url), 'utf8'));

const viewer = (role: string, permissions: string[]) => ({ role, can: (name: string) => matchPermission(permissions, name) });

describe('action permissions', () => {
  it('disables academic and staff writes for accounting while retaining finance actions', () => {
    const accounting = viewer('accounting', rolePermissions.find((role) => role.roleName === 'accounting')!.permissions);
    for (const resource of ['sections', 'cycles', 'staff']) {
      for (const action of ['create', 'update', 'delete']) expect(canPerformAction(accounting, `${action}:${resource}`)).toBe(false);
    }
    expect(canPerformAction(accounting, 'create:fees')).toBe(true);
    expect(canPerformAction(accounting, 'update:payments')).toBe(true);
    expect(canPerformAction(accounting, 'read:staff')).toBe(true);
  });

  it('honors explicit and wildcard grants without granting school-wide finance writes to a teacher', () => {
    expect(canPerformAction(viewer('secretary', ['update:sections']), 'update:sections')).toBe(true);
    expect(canPerformAction(viewer('principal', ['update:*']), 'update:sections')).toBe(true);
    expect(canPerformAction(viewer('admin', []), 'update:sections')).toBe(false);
    expect(canPerformAction(viewer('teacher', ['update:fees']), 'update:fees')).toBe(false);
  });

  it('protects nested custom menu actions and preserves workflow-disabled entries', () => {
    let calls = 0;
    const items = protectMenuItems(viewer('accounting', ['update:expenses']), [{ label: 'Actions', submenu: [
      { label: 'Edit section', permission: 'update:sections', onSelect: () => calls++ },
      { label: 'Approve', permission: 'update:expenses', onSelect: () => calls++ },
      { label: 'Paid', permission: 'update:expenses', disabled: true, onSelect: () => calls++ },
    ] }])[0].submenu!;
    expect(items[0].disabled).toBe(true);
    expect(items[0].onSelect).toBeUndefined();
    items[1].onSelect?.();
    expect(calls).toBe(1);
    expect(items[2].disabled).toBe(true);
    expect(items[2].onSelect).toBeUndefined();
  });

  it('renders disabled native controls and gates table callbacks, menus and inline editing', () => {
    const result = Bun.spawnSync([process.execPath, fileURLToPath(new URL('./permissionControls.fixture.tsx', import.meta.url))], { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' });
    expect(result.stderr.toString()).toBe('');
    expect(result.stdout.toString()).toContain('permission controls verified');
    expect(result.exitCode).toBe(0);
  });
});
