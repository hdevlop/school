import { afterEach, describe, expect, it } from 'bun:test';
import { StaffValidator } from '../../src/modules/staff/StaffValidator';

const originalDate = process.env.APP_BUSINESS_DATE;
afterEach(() => {
  if (originalDate === undefined) delete process.env.APP_BUSINESS_DATE;
  else process.env.APP_BUSINESS_DATE = originalDate;
});

const validator = new StaffValidator(undefined as any, undefined as any, undefined as any);
(validator as any).t = (key: string) => key;
const profile = { licenseNumber: 'DL12345', licenseType: 'D', licenseExpiry: '2026-10-21' };

describe('staff driver license boundary', () => {
  it('rejects an expired license on create and partial profile updates', () => {
    process.env.APP_BUSINESS_DATE = '2026-10-21';
    expect(() => validator.ensureDriverProfile({ ...profile, licenseExpiry: '2026-10-05' }))
      .toThrow('driverLicenseExpired');
    expect(() => validator.ensureDriverProfile({ licenseExpiry: '2026-10-05' }, true))
      .toThrow('driverLicenseExpired');
  });

  it('rejects malformed, blank and impossible expiry dates', () => {
    process.env.APP_BUSINESS_DATE = '2026-10-21';
    for (const licenseExpiry of ['', null, 123, 'not-a-date', '2030-02-30']) {
      expect(() => validator.ensureDriverProfile({ licenseExpiry }, true))
        .toThrow('driverLicenseExpiryInvalid');
    }
  });

  it('accepts today and future dates, retaining unrelated partial edits', () => {
    process.env.APP_BUSINESS_DATE = '2026-10-21';
    expect(() => validator.ensureDriverProfile(profile)).not.toThrow();
    expect(() => validator.ensureDriverProfile({ licenseExpiry: '2030-01-01' }, true)).not.toThrow();
    expect(() => validator.ensureDriverProfile({ notes: 'Updated contact information' }, true)).not.toThrow();
  });

  it('retains the required-profile checks for new drivers', () => {
    expect(() => validator.ensureDriverProfile()).toThrow('driverLicenseRequired');
    expect(() => validator.ensureDriverProfile({ licenseNumber: 'DL12345' })).toThrow('driverFieldRequired');
  });
});
