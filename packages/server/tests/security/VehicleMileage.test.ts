import { describe, expect, it } from 'bun:test';
import { VehicleService } from '../../src/modules/transport/vehicles/VehicleService';
import { VehicleValidator } from '../../src/modules/transport/vehicles/VehicleValidator';
import { withEnglishMessages } from '../support/englishMessages';

function harness(existing: { initialMileage: string; currentMileage: string } | null = null) {
  const writes: any[] = [];
  const repository = {
    getById: async () => existing,
    getByLicensePlate: async () => null,
    create: async (data: any) => { writes.push(data); return data; },
    update: async (_id: string, data: any) => { writes.push(data); return data; },
  };
  const validator = withEnglishMessages(new VehicleValidator(repository as any));
  return { writes, service: new VehicleService(repository as any, validator, {} as any) };
}

describe('vehicle odometer boundaries', () => {
  it('starts current mileage at the initial reading when omitted', async () => {
    const { service } = harness();
    expect(await service.create({ name: 'Navette Agdal', initialMileage: 12345 } as any))
      .toMatchObject({ initialMileage: 12345, currentMileage: 12345 });
  });

  it('preserves an explicit greater current reading', async () => {
    const { service } = harness();
    expect(await service.create({ name: 'Navette Agdal', initialMileage: 9000, currentMileage: 10000 } as any))
      .toMatchObject({ initialMileage: 9000, currentMileage: 10000 });
  });

  it('refuses an explicit lower current reading before creating', async () => {
    const { service, writes } = harness();
    await expect(service.create({ name: 'Navette Agdal', initialMileage: 1000, currentMileage: 999 } as any))
      .rejects.toMatchObject({ status: 400 });
    expect(writes).toHaveLength(0);
  });

  it('compares a partial baseline edit with the stored current reading', async () => {
    const { service, writes } = harness({ initialMileage: '9000.00', currentMileage: '10000.00' });
    await expect(service.update('owned-vehicle', { initialMileage: 10001 })).rejects.toMatchObject({ status: 400 });
    expect(writes).toHaveLength(0);
    await service.update('owned-vehicle', { initialMileage: 9500 });
    expect(writes).toEqual([{ initialMileage: 9500 }]);
  });

  it('compares a partial current reading numerically with the stored baseline', async () => {
    const { service, writes } = harness({ initialMileage: '9000.00', currentMileage: '10000.00' });
    await expect(service.update('owned-vehicle', { currentMileage: 8999 })).rejects.toMatchObject({ status: 400 });
    expect(writes).toHaveLength(0);
    await service.update('owned-vehicle', { currentMileage: 11000 });
    expect(writes).toEqual([{ currentMileage: 11000 }]);
  });

  it('allows unrelated partial edits of a legacy inconsistent reading', async () => {
    const { service, writes } = harness({ initialMileage: '9000.00', currentMileage: '0.00' });
    await service.update('owned-vehicle', { notes: 'Entretien planifié' });
    expect(writes).toEqual([{ notes: 'Entretien planifié' }]);
  });
});
