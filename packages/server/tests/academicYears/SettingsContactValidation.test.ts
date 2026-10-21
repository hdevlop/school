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
