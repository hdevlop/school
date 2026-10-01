/** Fixed identities for the dedicated academic-year acceptance database. */
export const historyYears = [
  { id: 'history-year-2024', label: '2024-2025', status: 'closed', start: '2024-09-01', instructionEnd: '2025-06-30', closeout: '2025-07-14', end: '2025-08-31' },
  { id: 'history-year-2025', label: '2025-2026', status: 'closed', start: '2025-09-01', instructionEnd: '2026-06-30', closeout: '2026-07-14', end: '2026-08-31' },
  { id: 'history-year-2026', label: '2026-2027', status: 'open', start: '2026-09-01', instructionEnd: '2027-06-30', closeout: '2027-07-14', end: '2027-08-31' },
] as const;

/** The same ten students recur across years; these are annual memberships. */
export const historyStudents = [
  { id: 'history-student-01', name: 'Adam El Amrani', years: ['2024-2025', '2025-2026', '2026-2027'] },
  { id: 'history-student-02', name: 'Salma Bennani', years: ['2024-2025', '2025-2026', '2026-2027'] },
  { id: 'history-student-03', name: 'Youssef Alaoui', years: ['2024-2025', '2025-2026', '2026-2027'] },
  { id: 'history-student-04', name: 'Mariam Idrissi', years: ['2024-2025', '2025-2026'] },
  { id: 'history-student-05', name: 'Omar Bennis', years: ['2024-2025', '2025-2026', '2026-2027'] },
  { id: 'history-student-06', name: 'Lina El Fassi', years: ['2024-2025', '2025-2026', '2026-2027'] },
  { id: 'history-student-07', name: 'Hamza Tahiri', years: ['2024-2025', '2025-2026'] },
  // A 2025-2026 fee for Aya is legitimate; it does not create an enrollment.
  { id: 'history-student-08', name: 'Aya Chraibi', years: ['2026-2027'] },
  { id: 'history-student-09', name: 'Ilyas Mansouri', years: ['2025-2026', '2026-2027'] },
  { id: 'history-student-10', name: 'Nour Ait Ali', years: ['2026-2027'] },
] as const;

/** One class and two sections per year; S05 moves from A to B in 2025-2026. */
export const historyClasses = historyYears.map((year) => ({
  id: `history-class-${year.label.slice(0, 4)}`,
  year: year.label,
  name: `History ${year.label}`,
  sections: [
    { id: `history-section-${year.label.slice(0, 4)}-a`, name: 'A' },
    { id: `history-section-${year.label.slice(0, 4)}-b`, name: 'B' },
  ],
}));

/** Exit dates are exclusive; placement dates follow the same convention. */
export const historyEnrollments = historyStudents.flatMap((student) =>
  student.years.map((label) => {
    const year = historyYears.find((item) => item.label === label)!;
    const withdrawn = student.id === 'history-student-07' && label === '2025-2026';
    const graduated = student.id === 'history-student-04' && label === '2025-2026';
    const transfer = student.id === 'history-student-05' && label === '2025-2026';
    const classId = `history-class-${label.slice(0, 4)}`;
    const sectionA = `history-section-${label.slice(0, 4)}-a`;
    const sectionB = `history-section-${label.slice(0, 4)}-b`;
    const exit = withdrawn ? '2026-03-01' : graduated ? '2026-07-01' : null;
    return {
      id: `history-enrollment-${student.id.slice(-2)}-${label.slice(0, 4)}`,
      studentId: student.id,
      yearId: year.id,
      label,
      status: withdrawn ? 'withdrawn' : graduated ? 'graduated' : 'active',
      enrolledOn: year.start,
      leftOn: exit,
      placements: transfer ? [
        { id: `history-placement-${student.id.slice(-2)}-${label.slice(0, 4)}-a`, classId, sectionId: sectionA, validFrom: year.start, validTo: '2026-01-15', reason: 'Original section' },
        { id: `history-placement-${student.id.slice(-2)}-${label.slice(0, 4)}-b`, classId, sectionId: sectionB, validFrom: '2026-01-15', validTo: null, reason: 'Midyear section transfer' },
      ] : [
        { id: `history-placement-${student.id.slice(-2)}-${label.slice(0, 4)}-a`, classId, sectionId: sectionA, validFrom: year.start, validTo: exit, reason: 'Initial placement' },
      ],
    };
  }),
);

export const historyAlertCases = [
  { id: 'history-alert-2024-academic', type: 'academic', year: '2024-2025', studentId: 'history-student-01' },
  { id: 'history-alert-2025-attendance', type: 'attendance', year: '2025-2026', studentId: 'history-student-05' },
  { id: 'history-alert-2025-reminder', type: 'reminder', year: '2025-2026', studentId: 'history-student-08' },
  { id: 'history-alert-2026-behavior', type: 'behavioral', year: '2026-2027', studentId: 'history-student-01' },
  { id: 'history-alert-2026-announcement', type: 'announcement', year: '2026-2027', studentId: null },
  { id: 'history-alert-shared-system', type: 'system', year: null, studentId: null },
  { id: 'history-alert-shared-emergency', type: 'emergency', year: null, studentId: null },
] as const;

export const historyAnnouncementCases = [
  { id: 'history-announcement-2024-all', year: '2024-2025', audience: 'all', classId: null,
    published: true, publishDate: '2024-10-01T08:00:00.000Z', expiryDate: '2025-05-01T08:00:00.000Z' },
  { id: 'history-announcement-2025-class', year: '2025-2026', audience: 'class',
    classId: 'history-class-2025', published: true,
    publishDate: '2025-10-01T08:00:00.000Z', expiryDate: '2026-05-01T08:00:00.000Z' },
  { id: 'history-announcement-2026-all', year: '2026-2027', audience: 'all', classId: null,
    published: true, publishDate: '2026-09-10T08:00:00.000Z', expiryDate: '2027-05-01T08:00:00.000Z' },
  { id: 'history-announcement-2026-class', year: '2026-2027', audience: 'class',
    classId: 'history-class-2026', published: false,
    // Still upcoming for getUpcoming() until this date passes, late in the year.
    publishDate: '2027-04-01T08:00:00.000Z', expiryDate: '2027-05-01T08:00:00.000Z' },
] as const;

export const historyAssessmentCases = [
  { id: 'history-assessment-2024', year: '2024-2025', date: '2024-10-10', section: 'history-section-2024-a' },
  { id: 'history-assessment-2025', year: '2025-2026', date: '2025-10-10', section: 'history-section-2025-a' },
  { id: 'history-assessment-2026', year: '2026-2027', date: '2026-10-10', section: 'history-section-2026-a' },
  { id: 'history-assessment-legacy-2025', year: null, date: '2025-11-10', section: 'history-section-2025-a' },
  { id: 'history-assessment-unresolved', year: null, date: '2023-10-10', section: 'history-section-2024-a' },
] as const;

export const historyAttendanceCases = [
  { id: 'history-attendance-2024', year: '2024-2025', date: '2024-10-11', section: 'history-section-2024-a', student: 'history-student-01' },
  { id: 'history-attendance-2025', year: '2025-2026', date: '2025-10-11', section: 'history-section-2025-a', student: 'history-student-05' },
  { id: 'history-attendance-2026', year: '2026-2027', date: '2026-10-11', section: 'history-section-2026-a', student: 'history-student-01' },
  { id: 'history-attendance-legacy-2025', year: null, date: '2025-11-11', section: 'history-section-2025-a', student: 'history-student-01' },
  { id: 'history-attendance-unresolved', year: null, date: '2023-10-11', section: 'history-section-2024-a', student: 'history-student-01' },
] as const;

export const historyFixtureExpected = {
  studentIdentities: 10,
  enrollmentsByYear: { '2024-2025': 7, '2025-2026': 8, '2026-2027': 8 },
  totalEnrollments: 23,
  alertsByYear: { '2024-2025': 1, '2025-2026': 2, '2026-2027': 2 },
  sharedAlerts: 2,
} as const;
