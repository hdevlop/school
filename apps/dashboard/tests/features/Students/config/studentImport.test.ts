import { describe, expect, it } from 'bun:test';
import { ar, en, es, fr } from '@sms/contracts/locales';
import { buildStudentImport, type StudentImportReason } from '@/features/Students/config/studentImport';
import { SCHOOL_CLASS_NAMES } from '@sms/contracts';

const classes = [
  { id: 'c1', name: 'CE1', academicYear: '2025-2026', sections: [{ id: 's1', name: 'A' }, { id: 's2', name: 'B' }] },
  { id: 'c2', name: 'CE2', academicYear: '2025-2026', sections: [] },
];

// The row the table exports: its accessor keys, gender and status as stored.
const exported = {
  studentCode: 'STU-1', name: 'Yasmine Alaoui', email: 'yasmine@example.ma', phone: '',
  class: 'CE1', section: 'A', gender: 'F', status: 'active',
};

describe('student import', () => {
  it('carries birthplace names and catalog IDs through JSON and spreadsheet import', () => {
    const result = buildStudentImport([{ ...exported, birthplaceId: 'MA-HCP-06141010', birthplace: ' Casablanca ', birthplaceArabic: ' الدار البيضاء ' }], classes, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students[0]).toMatchObject({ birthplaceId: 'MA-HCP-06141010', birthplace: 'Casablanca', birthplaceArabic: 'الدار البيضاء' });
    expect(buildStudentImport([{ ...exported, birthplace: 'x'.repeat(201) }], classes, '2026-01-12').problems[0].reason).toBe('invalidBirthplace');
    expect(buildStudentImport([exported], classes, '2026-01-12').students[0]).not.toHaveProperty('birthplace');
  });
  it('preserves the optional Arabic name and Massar code without replacing the main name', () => {
    const result = buildStudentImport([{ ...exported, studentCode: 'F257114351', arabicName: '  ياسمين العلوي  ' }], classes, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students[0]).toMatchObject({ studentCode: 'F257114351', name: exported.name, arabicName: 'ياسمين العلوي' });
    expect(buildStudentImport([{ ...exported, arabicName: '   ' }], classes, '2026-01-12').students[0]).not.toHaveProperty('arabicName');
    expect(buildStudentImport([{ ...exported, arabicName: 'ا'.repeat(101) }], classes, '2026-01-12').problems)
      .toEqual([{ row: 2, reason: 'invalidArabicName', value: undefined }]);
  });
  it('imports a guardian separately from the student login fields, without inventing a CIN', () => {
    const result = buildStudentImport([{
      ...exported, email: '', phone: '', guardianName: 'Fatima Alaoui', guardianPhone: '+212612345678', guardianRelationship: 'mother',
    }], classes, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students[0].email).toBe('');
    expect(result.students[0]).not.toHaveProperty('phone');
    expect(result.students[0].parents?.[0]).toMatchObject({ name: 'Fatima Alaoui', phone: '+212612345678', relationshipType: 'mother' });
    expect(result.students[0].parents?.[0].cin).toBeUndefined();
  });

  it('retains a guardian with no contact details and uses the alternate phone when available', () => {
    const result = buildStudentImport([
      { ...exported, studentCode: 'S1', guardianName: 'Guardian One' },
      { ...exported, studentCode: 'S2', guardianName: 'Guardian Two', guardianPhone2: '+212612345678' },
    ], classes, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students[0].parents?.[0]).toMatchObject({ name: 'Guardian One', relationshipType: 'guardian' });
    expect(result.students[0].parents?.[0].phone).toBeUndefined();
    expect(result.students[1].parents?.[0].phone).toBe('+212612345678');
  });

  it('flags invalid guardian details before sending a student request', () => {
    const result = buildStudentImport([{ ...exported, guardianName: 'Fatima Alaoui', guardianPhone: 'invalid' }], classes, '2026-01-12');
    expect(result.students).toEqual([]);
    expect(result.problems).toEqual([{ row: 2, reason: 'invalidGuardian', value: 'phone' }]);
  });
  it.each([...SCHOOL_CLASS_NAMES])('imports both class names for $official / $app', ({ official, app }) => {
    for (const savedName of [app, official]) {
      const existingClasses = [{ ...classes[0], name: savedName }];
      for (const inputName of [official, app, official.toLowerCase()]) {
        const result = buildStudentImport([{ ...exported, class: inputName, section: 1 }], existingClasses, '2026-01-12');
        expect(result.problems).toEqual([]);
        expect(result.students[0]).toMatchObject({ classId: 'c1', sectionId: 's1' });
      }
    }
  });

  it('imports an exported row back, admitted on the business date', () => {
    const { students, problems } = buildStudentImport([exported], classes, '2026-01-12');
    expect(problems).toEqual([]);
    expect(students).toEqual([{
      studentCode: 'STU-1', name: 'Yasmine Alaoui', email: 'yasmine@example.ma',
      gender: 'F', status: 'active', classId: 'c1', sectionId: 's1',
      enrollmentDate: '2026-01-12', yearEnrolledOn: '2026-01-12',
    }]);
  });

  it('matches names case-insensitively and reads spreadsheet cells as text', () => {
    const { students } = buildStudentImport([{
      ...exported, studentCode: 1042, class: ' ce1 ', section: 'b', gender: 'm', status: '',
      phone: 612345678, enrollmentDate: '2025-08-20T00:00:00.000Z', dateOfBirth: '2018-03-04',
    }], classes, '2026-01-12');
    expect(students[0]).toMatchObject({
      studentCode: '1042', classId: 'c1', sectionId: 's2', gender: 'M', phone: '612345678',
      dateOfBirth: '2018-03-04', enrollmentDate: '2025-08-20', yearEnrolledOn: '2025-09-01',
    });
    expect(students[0]).not.toHaveProperty('status');
  });

  it.each([1, '1', ' 1 ', 'a', 'A'])('matches section %j to A', (section) => {
    const result = buildStudentImport([{ ...exported, section }], classes, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students[0]?.sectionId).toBe('s1');
  });

  it('matches numeric sections to letters independently of section order', () => {
    const letterClasses = [{
      ...classes[0],
      sections: [{ id: 's3', name: 'C' }, { id: 's2', name: 'B' }, { id: 's1', name: 'A' }],
    }];
    const result = buildStudentImport([1, '2', 3].map((section, index) => ({
      ...exported, studentCode: `STU-${index}`, section,
    })), letterClasses, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students.map(student => student.sectionId)).toEqual(['s1', 's2', 's3']);
  });

  it('matches letters to existing numeric section names', () => {
    const numericClasses = [{
      ...classes[0],
      sections: [{ id: 's3', name: '3' }, { id: 's1', name: '1' }, { id: 's2', name: '2' }],
    }];
    const result = buildStudentImport(['a', 'B', ' c '].map((section, index) => ({
      ...exported, studentCode: `STU-${index}`, section,
    })), numericClasses, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students.map(student => student.sectionId)).toEqual(['s1', 's2', 's3']);
  });

  it('prefers the exact section name when both naming conventions exist', () => {
    const mixedClasses = [{
      ...classes[0], sections: [{ id: 'letter', name: 'A' }, { id: 'number', name: '1' }],
    }];
    for (const [section, id] of [['1', 'number'], ['a', 'letter']]) {
      const result = buildStudentImport([{ ...exported, section }], mixedClasses, '2026-01-12');
      expect(result.problems).toEqual([]);
      expect(result.students[0]?.sectionId).toBe(id);
    }
  });

  it.each(['', '0', '-1', '1.5', '3', '27', 'AA'])('rejects section %j without a matching section', (section) => {
    const result = buildStudentImport([{ ...exported, section }], classes, '2026-01-12');
    expect(result.students).toEqual([]);
    expect(result.problems).toEqual([{ row: 2, reason: 'unknownSection', value: section }]);
  });

  it('preserves custom section names without treating their array position as a number', () => {
    const customClasses = [{ ...classes[0], sections: [{ id: 'custom', name: 'Blue' }] }];
    const exact = buildStudentImport([{ ...exported, section: 'blue' }], customClasses, '2026-01-12');
    expect(exact.problems).toEqual([]);
    expect(exact.students[0]?.sectionId).toBe('custom');
    const numeric = buildStudentImport([{ ...exported, section: 1 }], customClasses, '2026-01-12');
    expect(numeric.students).toEqual([]);
    expect(numeric.problems).toEqual([{ row: 2, reason: 'unknownSection', value: '1' }]);
  });

  it('creates nobody when any row is wrong, naming each spreadsheet line', () => {
    const { problems } = buildStudentImport([
      exported,
      { ...exported, studentCode: 'STU-1', name: '', gender: 'X' },
      { ...exported, studentCode: 'STU-3', class: 'CM2', status: 'expelled' },
      { ...exported, studentCode: 'STU-4', class: 'CE2', enrollmentDate: '2026-02-30' },
    ], classes, '2026-01-12');
    expect(problems).toEqual([
      { row: 3, reason: 'missingName', value: undefined },
      { row: 3, reason: 'duplicateCode', value: 'STU-1' },
      { row: 3, reason: 'invalidGender', value: 'X' },
      { row: 4, reason: 'invalidStatus', value: 'expelled' },
      { row: 4, reason: 'unknownClass', value: 'CM2' },
      { row: 5, reason: 'unknownSection', value: 'A' },
      { row: 5, reason: 'invalidDate', value: '2026-02-30' },
    ]);
  });

  describe('JSON parents and fees', () => {
    const feeTypes = [
      { id: 'ft-tuition', name: 'Frais de scolarité', paymentType: 'recurring' },
      { id: 'ft-registration', name: 'Frais Inscription', paymentType: 'oneTime' },
      { id: 'ft-bus', name: 'Frais de transport 2 voyage', paymentType: 'recurring' },
    ];
    const enrolled = { ...exported, enrollmentDate: '2025-09-01' };

    it('imports every listed parent instead of the guardian columns', () => {
      const result = buildStudentImport([{
        ...enrolled, guardianName: 'Ignored Column',
        parents: [
          { name: 'Ahmed Alaoui', phone: '+212612345678', relationshipType: 'father', financialResponsibility: true },
          { name: 'Fatima Alaoui', phone: '+212698765432', relationshipType: 'mother' },
        ],
      }], classes, '2026-01-12', feeTypes);
      expect(result.problems).toEqual([]);
      expect(result.students[0].parents).toHaveLength(2);
      expect(result.students[0].parents?.[0]).toMatchObject({ name: 'Ahmed Alaoui', relationshipType: 'father', financialResponsibility: true });
      expect(result.students[0].parents?.[1]).toMatchObject({ name: 'Fatima Alaoui', phone: '+212698765432', relationshipType: 'mother' });
    });

    it('names the parent whose details are invalid', () => {
      const result = buildStudentImport([{
        ...enrolled, parents: [{ name: 'Ahmed Alaoui' }, { name: 'Fatima Alaoui', phone: 'invalid' }],
      }], classes, '2026-01-12', feeTypes);
      expect(result.students).toEqual([]);
      expect(result.problems).toEqual([{ row: 2, reason: 'invalidGuardian', value: 'parents[2]: phone' }]);
    });

    it('matches fee types by name or id and keeps the monthly price and start month', () => {
      const result = buildStudentImport([{
        ...enrolled,
        fees: [
          { feeType: 'frais inscription', baseAmount: 1100, academicYear: '2025-2026' },
          { feeType: 'Frais de scolarité', schedule: 'monthly', baseAmount: '1100', effectiveDate: '2025-09-01' },
          { feeTypeId: 'ft-bus', schedule: 'oneTime', baseAmount: 400, effectiveDate: '2025-10-01', notes: 'Transport 10/2025' },
        ],
      }], classes, '2026-01-12', feeTypes);
      expect(result.problems).toEqual([]);
      expect(result.students[0].fees).toEqual([
        { feeTypeId: 'ft-registration', schedule: 'oneTime', baseAmount: 1100 },
        { feeTypeId: 'ft-tuition', schedule: 'monthly', baseAmount: 1100, effectiveDate: '2025-09-01' },
        { feeTypeId: 'ft-bus', schedule: 'oneTime', baseAmount: 400, effectiveDate: '2025-10-01', notes: 'Transport 10/2025' },
      ]);
    });

    it('matches French fee names against older English defaults without saved labels', () => {
      const result = buildStudentImport([{
        ...enrolled, fees: [{ feeType: 'Frais Inscription' }, { feeType: 'Frais de scolarité', schedule: 'monthly' }],
      }], classes, '2026-01-12', [
        { id: 'FT01', name: 'Registration Fee', paymentType: 'oneTime', labels: null },
        { id: 'FT00', name: 'Tuition Fee', paymentType: 'recurring' },
      ]);
      expect(result.problems).toEqual([]);
      expect(result.students[0].fees).toEqual([
        { feeTypeId: 'FT01', schedule: 'oneTime' }, { feeTypeId: 'FT00', schedule: 'monthly' },
      ]);
    });

    it('matches custom translations and refuses ambiguous names unless an id resolves them', () => {
      const types = [
        { id: 'meal', name: 'Daily Meal', labels: { fr: 'Repas à la journée', ar: 'وجبة اليوم', es: 'Comida del día' } },
        { id: 'other', name: 'Repas à la journée' },
      ];
      for (const name of ['وجبة اليوم', 'Comida del día']) {
        const result = buildStudentImport([{ ...enrolled, fees: [{ feeType: name }] }], classes, '2026-01-12', types);
        expect(result.problems).toEqual([]);
        expect(result.students[0].fees?.[0].feeTypeId).toBe('meal');
      }
      const ambiguous = { ...enrolled, fees: [{ feeType: 'Repas à la journée' }] };
      expect(buildStudentImport([ambiguous], classes, '2026-01-12', types).problems)
        .toEqual([{ row: 2, reason: 'unknownFeeType', value: 'Repas à la journée' }]);
      const explicit = buildStudentImport([{ ...enrolled, fees: [{ feeTypeId: 'meal', feeType: 'Repas à la journée' }] }], classes, '2026-01-12', types);
      expect(explicit.problems).toEqual([]);
      expect(explicit.students[0].fees?.[0].feeTypeId).toBe('meal');
    });

    it('refuses fees the server would refuse, before any student is created', () => {
      const result = buildStudentImport([{
        ...enrolled, enrollmentDate: '2025-10-15',
        fees: [
          { feeType: 'Cantine' },
          { feeType: 'Frais de scolarité', schedule: 'weekly', baseAmount: -5 },
          { feeType: 'Frais de scolarité', academicYear: '2026-2027' },
          { feeType: 'Frais de scolarité', effectiveDate: '2025-09-01' },
          'not a fee',
        ],
      }], classes, '2026-01-12', feeTypes);
      expect(result.students).toEqual([]);
      expect(result.problems).toEqual([
        { row: 2, reason: 'unknownFeeType', value: 'Cantine' },
        { row: 2, reason: 'invalidFee', value: 'fees[2].schedule' },
        { row: 2, reason: 'invalidFee', value: 'fees[2].baseAmount' },
        { row: 2, reason: 'feeYearMismatch', value: '2026-2027' },
        { row: 2, reason: 'feeBeforeEnrollment', value: '2025-09-01' },
        { row: 2, reason: 'invalidFee', value: 'fees[5]' },
      ]);
    });

    it('keeps spreadsheet rows unchanged when they carry no parents or fees', () => {
      const result = buildStudentImport([exported], classes, '2026-01-12', feeTypes);
      expect(result.students[0]).not.toHaveProperty('fees');
      expect(result.students[0]).not.toHaveProperty('parents');
    });
  });

  it('has every reason in all four catalogs', () => {
    const reasons: StudentImportReason[] = ['missingName', 'invalidArabicName', 'invalidBirthplace', 'invalidGender', 'invalidStatus', 'unknownClass', 'unknownSection', 'invalidDate', 'duplicateCode', 'invalidGuardian', 'unknownFeeType', 'invalidFee', 'feeYearMismatch', 'feeBeforeEnrollment'];
    for (const catalog of [en, fr, es, ar] as any[]) {
      for (const reason of reasons) expect(typeof catalog.students.import.reasons[reason]).toBe('string');
    }
  });
});


describe('departed student import', () => {
  it('keeps a departed student and carries the departure to the server', () => {
    const result = buildStudentImport([{ ...exported, left: true, leftOn: '2025-10-12', enrollmentDate: '2025-09-01' }], classes, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students[0].departure).toEqual({ leftOn: '2025-10-12', status: 'withdrawn' });
  });
  it('refuses to silently activate a departed student without a leaving date', () => {
    const result = buildStudentImport([{ ...exported, left: true }], classes, '2026-01-12');
    expect(result.students).toEqual([]);
    expect(result.problems[0].reason).toBe('missingLeavingDate');
  });
  it('refuses a departure before enrollment or an impossible date', () => {
    for (const leftOn of ['2025-09-01', '2025-08-31', '2025-02-30']) {
      expect(buildStudentImport([{ ...exported, left: true, leftOn, enrollmentDate: '2025-09-01' }], classes, '2026-01-12').problems[0].reason).toBe('invalidDate');
    }
  });
});


describe('occasional fee containers in student import', () => {
  it('creates one empty container at the catalog unit price for several historical charges', () => {
    const mealTypes = [{ id: 'meal', name: 'Daily meal', paymentType: 'oneTime', amount: 35 }];
    const result = buildStudentImport([{ ...exported, enrollmentDate: '2025-09-01', fees: [
      { feeType: 'Daily meal', schedule: 'occasional', baseAmount: 70, effectiveDate: '2025-10-01' },
      { feeType: 'Daily meal', schedule: 'occasional', baseAmount: 105, effectiveDate: '2025-09-01' },
    ] }], classes, '2026-01-12', mealTypes);
    expect(result.problems).toEqual([]);
    expect(result.students[0].fees).toEqual([{ feeTypeId: 'meal', schedule: 'occasional', baseAmount: 35, effectiveDate: '2025-09-01' }]);
  });
  it('refuses undated occasional source charges', () => {
    const result = buildStudentImport([{ ...exported, fees: [
      { feeType: 'Daily meal', schedule: 'occasional', baseAmount: 35 },
    ] }], classes, '2026-01-12', [{ id: 'meal', name: 'Daily meal', amount: 35 }]);
    expect(result.students).toEqual([]);
    expect(result.problems[0].reason).toBe('invalidFee');
  });
});
