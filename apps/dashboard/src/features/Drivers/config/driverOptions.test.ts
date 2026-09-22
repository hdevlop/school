import { describe, expect, it } from 'bun:test';
import { DRIVER_STATUS_VALUES, GENDER_VALUES } from '@sms/contracts';

import { driverSchema } from './driverSchemas';
import {
  DRIVER_LICENSE_TYPE_OPTIONS,
  buildDriverStatusOptions,
  buildGenderOptions,
} from './driverOptions';

const echo = (key: string) => key;

const validDriver = {
  name: 'Ali Benani',
  email: 'ali@example.com',
  cin: 'AB123456',
  phone: '212600000000',
  licenseNumber: 'D12345',
  licenseType: 'D',
  licenseExpiry: '2027-01-01',
  hireDate: '2020-01-01',
};

describe('driver status options', () => {
  it('offers exactly the statuses the API accepts', () => {
    expect(buildDriverStatusOptions(echo).map((option) => option.value)).toEqual([
      ...DRIVER_STATUS_VALUES,
    ]);
  });

  /**
   * The bug this replaced: the hand-written list submitted `on_leave` while
   * every layer below spells it `onLeave`, so "On Leave" could be chosen but
   * never saved.
   */
  it('offers onLeave, not the on_leave the old hand-written list submitted', () => {
    const values = buildDriverStatusOptions(echo).map((option) => option.value);

    expect(values).toContain('onLeave');
    expect(values).not.toContain('on_leave' as never);
  });

  it('offers only statuses the bound schema will accept', () => {
    for (const option of buildDriverStatusOptions(echo)) {
      expect(
        driverSchema.safeParse({ ...validDriver, status: option.value }).success,
        `${option.value} is offered but rejected`,
      ).toBe(true);
    }
  });

  it('labels each status from drivers.status', () => {
    expect(buildDriverStatusOptions(echo)).toContainEqual({
      value: 'onLeave',
      label: 'drivers.status.onLeave',
    });
  });
});

describe('driver gender options', () => {
  it('uses the same contract values and translation family as the other person forms', () => {
    expect(buildGenderOptions(echo)).toEqual(
      GENDER_VALUES.map((value) => ({ value, label: `common.gender.${value}` })),
    );
  });
});

describe('licence type options', () => {
  it('lists the Moroccan categories as plain untranslated text', () => {
    expect(DRIVER_LICENSE_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
  });

  it('stays inside the length the schema allows for free-text licence types', () => {
    for (const option of DRIVER_LICENSE_TYPE_OPTIONS) {
      expect(
        driverSchema.safeParse({ ...validDriver, licenseType: option.value }).success,
      ).toBe(true);
    }
  });
});
