import { readFileSync } from 'node:fs';
import { readExport, type MassarExport } from '../../src/modules/massar/workbook/readExport';
import type { Setup } from '../../src/modules/massar/importPreview';
import { Server } from 'najm-core';
import { i18n } from 'najm-i18n';
import { schoolI18n } from '@sms/contracts/locales';
export async function massarTestI18n() {
  const app = new Server({ isolated: true, silent: true }).use(i18n(schoolI18n.options));
  await app.fetch(new Request('http://massar.test/bootstrap'));
  return app;
}
export const template = new Uint8Array(readFileSync(new URL('./fixtures/synthetic.xlsx', import.meta.url)));
export async function exportFixture(): Promise<MassarExport> {
  return { ...await readExport(template), students: [{ massarStudentId: 'synthetic-hidden', studentCode: 'SYNTHETIC1', name: 'Synthetic student', dateOfBirth: '01-01-2018', marks: [] }] };
}
export function setupFixture(): Setup {
  return { year: null, yearLabel: '2026-2027', levels: [], classes: [], subjects: [], enrollments: [],
    appClasses: [{ id: 'class-cp', name: 'CP' }], appSections: [{ id: 'section-a', classId: 'class-cp', name: 'A' }], appSubjects: [{ id: 'subject-arabic', code: '0011', name: 'Synthetic subject' }],
    appStudents: [{ id: 'student-1', studentCode: 'SYNTHETIC1', name: 'Synthetic student', arabicName: null, dateOfBirth: '2018-01-01', classId: 'class-cp', sectionId: 'section-a' }], assignments: [],
  } as Setup;
}
