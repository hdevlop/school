import { describe, expect, it } from 'bun:test';
import { VEHICLE_STATUS_VALUES, VEHICLE_TYPE_VALUES } from '@sms/contracts';
import ar from '@server/locales/ar.json';
import en from '@server/locales/en.json';
import es from '@server/locales/es.json';
import fr from '@server/locales/fr.json';

import { vehicleSchema } from './vehicleSchemas';
import { buildVehicleStatusOptions, buildVehicleTypeOptions } from './vehicleOptions';

const echo = (key: string) => key;

const validVehicle = {
  name: 'Bus 1',
  brand: 'Mercedes',
  model: 'Sprinter',
  year: 2020,
  capacity: 30,
  licensePlate: 'A-1234',
};

describe('vehicle option builders', () => {
  it('offers exactly what the API accepts, in contract order', () => {
    expect(buildVehicleTypeOptions(echo).map((option) => option.value)).toEqual([
      ...VEHICLE_TYPE_VALUES,
    ]);
    expect(buildVehicleStatusOptions(echo).map((option) => option.value)).toEqual([
      ...VEHICLE_STATUS_VALUES,
    ]);
  });

  /**
   * What the hand-written lists used to get wrong. `van`, `truck` and `suv`
   * were offered but rejected by the schema and the column; `sedan`, `shuttle`
   * and `inactive` existed but could not be chosen.
   */
  it('no longer offers types the API would reject', () => {
    const values = buildVehicleTypeOptions(echo).map((option) => option.value);

    for (const gone of ['van', 'truck', 'suv']) {
      expect(values).not.toContain(gone as never);
    }
    expect(values).toContain('sedan');
    expect(values).toContain('shuttle');
  });

  it('lets a bus be taken off the road without retiring it', () => {
    expect(buildVehicleStatusOptions(echo).map((option) => option.value)).toContain('inactive');
  });

  it('offers only values the bound schema will accept', () => {
    for (const option of buildVehicleTypeOptions(echo)) {
      expect(
        vehicleSchema.safeParse({ ...validVehicle, type: option.value }).success,
        `type ${option.value} is offered but rejected`,
      ).toBe(true);
    }
    for (const option of buildVehicleStatusOptions(echo)) {
      expect(
        vehicleSchema.safeParse({ ...validVehicle, status: option.value }).success,
        `status ${option.value} is offered but rejected`,
      ).toBe(true);
    }
  });

  /**
   * A select whose labels fall back to raw keys is worse than one with fewer
   * options, so every offered value is checked against all four catalogs here
   * rather than only in the repo-wide i18n scan, which cannot resolve a
   * template key.
   */
  it('has a translation for every offered value in all four languages', () => {
    const catalogs: Record<string, any> = { en, fr, ar, es };

    for (const [language, catalog] of Object.entries(catalogs)) {
      for (const value of VEHICLE_TYPE_VALUES) {
        expect(catalog.vehicles.types[value], `${language} is missing vehicles.types.${value}`).toBeTruthy();
      }
      for (const value of VEHICLE_STATUS_VALUES) {
        expect(catalog.vehicles.status[value], `${language} is missing vehicles.status.${value}`).toBeTruthy();
      }
    }
  });
});
