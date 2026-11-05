import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { StorageService } from 'najm-storage';
import { StaffService } from '../../src/modules/staff/StaffService';

function harness(image: string | null = '/images/registrar_male.png') {
  const existing = { id: 'staff-1', userId: 'user-1', role: 'registrar', gender: 'M', image };
  const userUpdates: Record<string, unknown>[] = [];
  const uploads: string[] = [];
  const storage = Object.assign(Object.create(StorageService.prototype), {
    saveFile: async (namespace: string, path: string) => { uploads.push(`${namespace}/${path}`); },
    getServePath: (namespace: string, path: string) => `/api/${namespace}/files/serve/${path}`,
  });
  const service = new StaffService(
    { update: async (_id: string, data: object) => ({ ...existing, ...data }) } as never,
    {
      ensureExists: async () => existing,
      ensureRoleExists: async () => ({ accessRoleId: 'staff-role' }),
      ensureCanChangeJobTitle: () => {},
      ensureNoLoginForTitle: () => {},
    } as never,
    {
      getAuthRecordById: async () => ({ roleId: 'staff-role' }),
      update: async (_id: string, data: Record<string, unknown>) => { userUpdates.push(data); },
    } as never,
    {} as never, storage, {} as never,
    { endCurrentForRole: async () => {} } as never,
    {} as never, {} as never,
  );
  return { service, userUpdates, uploads };
}

describe('staff avatar edits', () => {
  it('switches a stored default on a gender-only update', async () => {
    const { service, userUpdates } = harness();
    await service.update('staff-1', { gender: 'F' });
    expect(userUpdates).toEqual([{ image: '/images/registrar_female.png' }]);
  });

  it('replaces the old default even when the client sends its stored URL', async () => {
    const { service, userUpdates } = harness();
    await service.update('staff-1', { gender: 'F', image: '/images/registrar_male.png' });
    expect(userUpdates).toEqual([{ image: '/images/registrar_female.png' }]);
  });

  it('uses the new job title and gender, including versioned supervisor assets', async () => {
    const { service, userUpdates } = harness();
    await service.update('staff-1', { role: 'supervisor', gender: 'F' });
    expect(userUpdates).toEqual([{ image: '/images/supervisor_female_v2.png' }]);
  });

  it('keeps an uploaded photo when gender or job title changes', async () => {
    const { service, userUpdates } = harness('/api/staff/files/serve/staff-1_avatar.png');
    await service.update('staff-1', { role: 'secretary', gender: 'F' });
    expect(userUpdates).toEqual([]);
  });

  it('saves an explicitly supplied existing photo instead of the default', async () => {
    const { service, userUpdates } = harness();
    await service.update('staff-1', { gender: 'F', image: '/api/users/files/serve/photo.png' });
    expect(userUpdates).toEqual([{ image: '/api/users/files/serve/photo.png' }]);
  });

  it('uploads a replacement photo while changing gender', async () => {
    const { service, userUpdates, uploads } = harness();
    // Multipart validation restores File after the JSON-compatible DTO is parsed.
    await service.update('staff-1', { gender: 'F', image: new File(['photo'], 'photo.png', { type: 'image/png' }) } as never);
    expect(uploads).toEqual(['staff/staff-1_avatar.png']);
    expect(userUpdates).toEqual([{ image: '/api/staff/files/serve/staff-1_avatar.png' }]);
  });

  it('returns to the current gender default when a photo is cleared', async () => {
    const { service, userUpdates } = harness('/api/staff/files/serve/staff-1_avatar.png');
    await service.update('staff-1', { gender: 'F', image: null });
    expect(userUpdates).toEqual([{ image: '/images/registrar_female.png' }]);
  });

  it('leaves the image alone on unrelated edits', async () => {
    const { service, userUpdates } = harness();
    await service.update('staff-1', { address: 'Rabat' });
    expect(userUpdates).toEqual([]);
  });
});
