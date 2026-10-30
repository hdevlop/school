import { expect, it } from 'bun:test';
import { createSettingsDto, updateSettingsDto } from '../../src/modules/settings/SettingsDto';

const installation = { schoolName: 'Demo school', schoolAddress: 'Fictional demo address', schoolEmail: 'contact@school.test', schoolPhone: '212600000000', currentAcademicYear: '2026-2027' };

it('requires school contacts on installation and rejects explicitly blank edits', () => {
  expect(createSettingsDto.safeParse(installation).success).toBe(true);
  for (const field of ['schoolAddress', 'schoolEmail']) {
    expect(createSettingsDto.safeParse({ ...installation, [field]: '   ' }).success).toBe(false);
    expect(updateSettingsDto.safeParse({ [field]: '' }).success).toBe(false);
  }
});

it('keeps partial updates partial and accepts reserved demo addresses', () => {
  expect(updateSettingsDto.parse({ schoolName: 'Fictional Demo' })).toEqual({ schoolName: 'Fictional Demo' });
  expect(updateSettingsDto.parse({ schoolEmail: 'contact@school.test' })).toEqual({ schoolEmail: 'contact@school.test' });
});

it('accepts the official identity, local phone numbers included, and refuses a fourth phone', () => {
  const identity = { schoolNameAr: 'مؤسسة جان هنري لامبير', schoolPhones: ['0522750085', '0808524592', '0668095157'], schoolLicenseNumber: '2015/100.119', schoolLicenseDate: '2015-10-19' };
  expect(updateSettingsDto.parse(identity)).toEqual(identity);
  expect(updateSettingsDto.parse({ schoolLicenseNumber: null, schoolLicenseDate: null })).toEqual({ schoolLicenseNumber: null, schoolLicenseDate: null });
  expect(updateSettingsDto.safeParse({ schoolPhones: [...identity.schoolPhones, '0522000000'] }).success).toBe(false);
  expect(updateSettingsDto.safeParse({ schoolPhones: ['call us'] }).success).toBe(false);
  expect(updateSettingsDto.safeParse({ schoolLicenseDate: '19/10/2015' }).success).toBe(false);
});
