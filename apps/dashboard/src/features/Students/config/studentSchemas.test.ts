import { describe, expect, it } from 'bun:test';
import { GENDER_VALUES, STUDENT_STATUS_VALUES } from '@sms/contracts';

import { PLACEMENT_FIELDS, studentProfileEditSchema, studentSchema } from './studentSchemas';

const somewhere = { address: '12 Rue des Écoles', latitude: 33.57, longitude: -7.59 };

const student = {
  classId: 'cls1',
  sectionId: 'sec1',
  studentCode: 'STU-001',
  name: 'Sara Bennani',
  email: 'sara@example.com',
  addressLocation: somewhere,
  enrollmentDate: '2025-09-01',
  gender: 'F',
};

describe('studentSchema', () => {
  it('defaults a new student to active', () => {
    expect(studentSchema.parse(student).status).toBe('active');
  });

  it('accepts every status and gender the API accepts', () => {
    for (const status of STUDENT_STATUS_VALUES) {
      expect(studentSchema.safeParse({ ...student, status }).success).toBe(true);
    }
    for (const gender of GENDER_VALUES) {
      expect(studentSchema.safeParse({ ...student, gender }).success).toBe(true);
    }
  });

  it('needs a class and a section, because a student sits somewhere', () => {
    expect(studentSchema.safeParse({ ...student, classId: '' }).success).toBe(false);
    expect(studentSchema.safeParse({ ...student, sectionId: '' }).success).toBe(false);
  });

  it('keeps the address as the picker wrote it, rather than flattening it', () => {
    const parsed = studentSchema.parse(student);

    expect(parsed.addressLocation).toEqual(somewhere);
  });

  it('accepts an address with no coordinates, which is what a typed address gives', () => {
    expect(
      studentSchema.safeParse({
        ...student,
        addressLocation: { address: 'Casablanca', latitude: null, longitude: null },
      }).success,
    ).toBe(true);
  });

  it('accepts a Moroccan phone, or none at all', () => {
    expect(studentSchema.safeParse({ ...student, phone: '212600000000' }).success).toBe(true);
    expect(studentSchema.safeParse({ ...student, phone: null }).success).toBe(true);
    expect(studentSchema.safeParse({ ...student, phone: '06 00 00 00 00' }).success).toBe(false);
  });

  it('treats a cleared email as absent rather than malformed', () => {
    expect(studentSchema.safeParse({ ...student, email: '' }).success).toBe(true);
    expect(studentSchema.safeParse({ ...student, email: 'nope' }).success).toBe(false);
  });

  it('accepts either a picked file or a stored path as the photo', () => {
    expect(studentSchema.safeParse({ ...student, image: '/images/student_female.png' }).success).toBe(true);
    expect(studentSchema.safeParse({ ...student, image: new File([], 'photo.png') }).success).toBe(true);
    expect(studentSchema.safeParse({ ...student, image: null }).success).toBe(true);
  });

  it('accepts the enrolment date in any of the formats the date inputs emit', () => {
    for (const enrollmentDate of ['2025-09-01', '09/01/2025', '01-09-2025', '01-09-25']) {
      expect(studentSchema.safeParse({ ...student, enrollmentDate }).success).toBe(true);
    }
    expect(studentSchema.safeParse({ ...student, enrollmentDate: 'September' }).success).toBe(false);
  });
});

describe('studentProfileEditSchema', () => {
  it('edits a profile without a class or section, as for a year without a placement', () => {
    const { classId: _classId, sectionId: _sectionId, ...profile } = student;
    expect(studentProfileEditSchema.safeParse(profile).success).toBe(true);
    expect(studentProfileEditSchema.safeParse({ ...profile, classId: null, sectionId: null }).success).toBe(true);
  });

  it('still validates the identity fields', () => {
    expect(studentProfileEditSchema.safeParse({ ...student, name: 'A' }).success).toBe(false);
  });

  it('saves blank optional profile fields as null, including when a historical correction is submitted', () => {
    const parsed = studentProfileEditSchema.parse({
      ...student, phone: '', dateOfBirth: '',
      correctionPlacementId: 'past-placement', correctionReason: 'Correct the historical section',
    });
    expect(parsed.phone).toBeNull();
    expect(parsed.dateOfBirth).toBeNull();
    expect(parsed.correctionReason).toBe('Correct the historical section');
    expect(studentSchema.parse({ ...student, phone: '', dateOfBirth: '' }).phone).toBeNull();
  });

  it('still rejects nonempty invalid optional profile fields', () => {
    expect(studentProfileEditSchema.safeParse({ ...student, phone: 'invalid' }).success).toBe(false);
    expect(studentProfileEditSchema.safeParse({ ...student, dateOfBirth: 'yesterday' }).success).toBe(false);
  });

  it('names the fields the enrollment records own', () => {
    expect([...PLACEMENT_FIELDS]).toEqual(['classId', 'sectionId', 'status']);
  });
});
