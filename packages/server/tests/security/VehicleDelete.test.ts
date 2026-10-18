import { describe, expect, it } from 'bun:test';
import { VehicleService } from '../../src/modules/transport/vehicles/VehicleService';
import { VehicleValidator } from '../../src/modules/transport/vehicles/VehicleValidator';
import { withEnglishMessages } from '../support/englishMessages';

function harness(inUse: boolean) {
  const calls: string[] = [];
  const repository = {
    lockForDeletion: async () => { calls.push('lock'); },
    getById: async (id: string) => ({ id }),
    isInUse: async () => { calls.push('references'); return inUse; },
    delete: async (id: string) => { calls.push('delete'); return { id }; },
  };
  return { calls, service: new VehicleService(repository as any,
    withEnglishMessages(new VehicleValidator(repository as any)), {} as any) };
}

describe('vehicle deletion preserves transport history', () => {
  it('refuses a referenced vehicle before a cascading delete', async () => {
    const { service, calls } = harness(true);
    await expect(service.delete('owned-vehicle')).rejects.toMatchObject({ status: 409,
      message: 'This vehicle has transport assignments or operational history and cannot be deleted' });
    expect(calls).toEqual(['lock', 'references']);
  });

  it('locks and deletes an unreferenced vehicle', async () => {
    const { service, calls } = harness(false);
    expect(await service.delete('owned-vehicle')).toEqual({ id: 'owned-vehicle' });
    expect(calls).toEqual(['lock', 'references', 'delete']);
  });
});
