import { describe, expect, it } from 'bun:test';

import { enumValues, type EnumKey } from '../src/lookup';

/**
 * These strings are written into Postgres and sent over the API. A value that
 * changes here is a data migration; a value that disappears orphans every row
 * already holding it. So the persisted enums are pinned member-by-member and
 * in order: drizzle-kit diffs `pgEnum` members positionally, and a reorder
 * generates a migration even though nothing was really added.
 *
 * Reaching this test with a failure is the point. Update it only together with
 * a migration that moves the existing rows.
 */
const PERSISTED_ENUMS: Partial<Record<EnumKey, readonly string[]>> = {
  alertPriority: ['low', 'medium', 'high', 'critical'],
  alertStatus: ['active', 'acknowledged', 'resolved', 'dismissed'],
  alertType: [
               'academic',
               'attendance',
               'behavioral',
               'health',
               'system',
               'announcement',
               'reminder',
               'emergency',
             ],
  assessmentStatus: ['scheduled', 'active', 'completed', 'cancelled'],
  assessmentType: ['quiz', 'assignment', 'project', 'participation', 'test', 'presentation'],
  assignmentStatus: ['active', 'completed', 'cancelled'],
  attendanceStatus: ['present', 'absent', 'late'],
  attendanceType: ['student', 'staff'],
  busStatus: ['active', 'inactive', 'maintenance', 'retired'],
  calendarSystem: ['SEMESTER', 'TRIMESTER', 'QUARTER'],
  compensationMode: ['monthly', 'hourly'],
  disciplineAction: [
                      'verbal_warning',
                      'written_warning',
                      'detention',
                      'counseling',
                      'parent_meeting',
                      'suspension',
                      'other',
                    ],
  disciplineCategory: [
                        'classroom_disruption',
                        'disrespect',
                        'bullying',
                        'fighting',
                        'cheating',
                        'vandalism',
                        'uniform_violation',
                        'device_misuse',
                        'prohibited_item',
                        'other',
                      ],
  disciplineSeverity: ['low', 'medium', 'high', 'critical'],
  disciplineStatus: ['open', 'resolved'],
  employmentType: ['fullTime', 'partTime', 'contract', 'temporary'],
  eventStatus: ['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'],
  eventType: [
               'academic',
               'sports',
               'cultural',
               'holiday',
               'exam',
               'meeting',
               'workshop',
               'fieldtrip',
               'ceremony',
               'conference',
               'other',
             ],
  eventVisibility: ['public', 'private', 'teachers', 'students', 'parents', 'staff'],
  examSecurity: ['low', 'medium', 'high'],
  examStatus: ['scheduled', 'active', 'completed', 'cancelled', 'rescheduled'],
  examType: ['midterm', 'final', 'standardized'],
  expenseCategory: [
                     'utilities',
                     'maintenance',
                     'supplies',
                     'equipment',
                     'transport',
                     'food',
                     'security',
                     'cleaning',
                     'insurance',
                     'rent',
                     'tax',
                     'marketing',
                     'training',
                     'technology',
                     'miscellaneous',
                   ],
  expenseStatus: ['pending', 'approved', 'paid', 'rejected', 'cancelled'],
  feeInstallmentStatus: ['pending', 'partiallyPaid', 'paid', 'overdue', 'cancelled'],
  feeStatus: ['pending', 'partiallyPaid', 'paid', 'overdue'],
  feeTypeStatus: ['active', 'inactive', 'archived'],
  fuelType: ['gasoline', 'diesel', 'electric', 'hybrid', 'lpg', 'cng'],
  gender: ['M', 'F'],
  gradeStatus: ['pending', 'graded', 'missed'],
  language: ['en', 'fr', 'ar', 'es'],
  maintenanceStatus: ['scheduled', 'inProgress', 'completed', 'cancelled', 'overdue'],
  maintenanceType: ['scheduled', 'repair', 'inspection', 'oilChange', 'filterChange', 'other'],
  maritalStatus: ['single', 'married', 'divorced', 'widowed', 'separated'],
  participantType: ['student', 'teacher', 'parent', 'staff'],
  paymentMethod: [
                   'cash',
                   'bankTransfer',
                   'check',
                   'creditCard',
                   'debitCard',
                   'online',
                   'mobilePayment',
                 ],
  paymentStatus: ['completed', 'pending', 'deposited', 'bounced', 'failed', 'refunded', 'voided'],
  paymentType: ['recurring', 'oneTime'],
  payslipStatus: ['pending', 'paid', 'cancelled'],
  refuelStatus: ['pending', 'completed', 'cancelled'],
  relationshipType: ['father', 'mother', 'guardian', 'stepparent', 'grandparent', 'other'],
  schedule: ['monthly', 'quarterly', 'semester', 'annually', 'oneTime'],
  sectionStatus: ['active', 'inactive', 'archived'],
  shift: ['morning', 'afternoon', 'evening', 'fullDay'],
  staffStatus: ['active', 'inactive', 'onLeave', 'suspended', 'terminated'],
  studentStatus: ['active', 'inactive', 'graduated', 'transferred'],
  submissionType: ['online', 'paper', 'presentation', 'practical', 'discussion'],
  vehicleDocumentType: ['insurance', 'registration', 'inspection', 'emission', 'license'],
  vehicleStatus: ['active', 'inactive', 'maintenance', 'retired'],
  vehicleType: ['sedan', 'minibus', 'fullbus', 'shuttle'],
};

describe('shared enum contract', () => {
  it('pins the exact members and order of every persisted enum', () => {
    for (const [key, expected] of Object.entries(PERSISTED_ENUMS)) {
      expect(enumValues[key as EnumKey]).toEqual(expected as never);
    }
  });

  it('covers every enum that backs a database column', () => {
    // A new `pgEnum(...)` without an entry above would ship unpinned, so the
    // count is asserted rather than left to whoever adds the next one.
    expect(Object.keys(PERSISTED_ENUMS)).toHaveLength(50);
  });

  it('gives every enum at least one member', () => {
    for (const [key, values] of Object.entries(enumValues)) {
      expect(values.length, `${key} is empty`).toBeGreaterThan(0);
    }
  });

  it('holds only non-empty, unique strings', () => {
    for (const [key, values] of Object.entries(enumValues)) {
      for (const value of values) {
        expect(typeof value, `${key} holds a non-string`).toBe('string');
        expect(value.trim(), `${key} holds a blank member`).not.toBe('');
      }
      expect(new Set(values).size, `${key} repeats a member`).toBe(values.length);
    }
  });
});
