import { expect, test } from 'bun:test';
import { schoolContactPhoneDefaults, schoolContactPhones } from '@/features/Settings/config/schoolContactPhones';

test('merges the old contact and document fields without repeating a phone', () => {
  expect(schoolContactPhoneDefaults({ schoolPhone: '+212668095157', schoolPhones: ['0808524592', '0668095157'] })).toEqual({
    schoolPhone: '+212668095157', additionalSchoolPhones: ['0808524592', ''],
  });
  expect(schoolContactPhoneDefaults()).toEqual({ schoolPhone: '', additionalSchoolPhones: ['', ''] });
});

test('saves the main phone with at most two additional numbers in one document list', () => {
  const schoolPhone = '+212668095157';
  const schoolPhones = schoolContactPhones(schoolPhone, [' 0808524592 ', '', '0522000000']);
  expect(schoolPhones).toEqual([schoolPhone, '0808524592', '0522000000']);
});

test('recognizes country codes and punctuation when removing duplicates', () => {
  expect(schoolContactPhones('212668095157', ['+212 668-095157', '0668.095157', '0808524592'])).toEqual(['212668095157', '0808524592']);
});

test('limits legacy records to the three phone inputs', () => {
  expect(schoolContactPhoneDefaults({ schoolPhone: '+212668095157', schoolPhones: ['0808524592', '0522000000', '0522334455'] })).toEqual({
    schoolPhone: '+212668095157', additionalSchoolPhones: ['0808524592', '0522000000'],
  });
});
