import assert from 'node:assert/strict';
import { mock } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { translate } from 'najm-i18n';
import { translations } from '@sms/contracts/locales';
import type { MassarSheetDetail } from '@sms/contracts';
let role = 'teacher';
const detail: MassarSheetDetail = {
  sheet: { id: 'sheet', roundId: 'round', className: '1APG-1', subjectName: 'العربية', teacherName: 'Salma', status: 'in_progress', missing: 1, total: 2, revision: 3, termLabel: '', examLabel: '', roundStatus: 'open' },
  round: { id: 'round', term: 1, exam: 1, status: 'open', termLabel: '', examLabel: '' },
  students: [{ id: 'student', name: 'Synthetic learner', studentCode: 'SYNTHETIC', position: 0, dateOfBirth: '01-01-2018', massarStudentId: 1 }],
  components: [{ code: 'a', name: 'القراءة' }, { code: 'b', name: 'الكتابة' }], maxMark: 10,
  schoolName: 'Synthetic school', yearLabel: '2026-2027', levelLabel: 'Primary', marks: [{ studentId: 'student', componentCode: 'a', mark: null, absence: 'justified' }], remarks: [], canEdit: true, canReopen: false,
};
mock.module('najm-i18n/react', () => ({ useTranslation: () => ({ language: 'ar', t: (key: string, params?: any) => translate(translations, 'ar', key, params) }) }));
mock.module('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: async () => {} }) }));
mock.module('@/features/Users/hooks/useViewerRole', () => ({ useViewerRole: () => ({ userId: role, role, can: () => role !== 'supervisor' }) }));
mock.module('@/features/AcademicYears/hooks/useYearScopedQuery', () => ({ useAcademicYearScope: () => ({ academicYear: '2026-2027' }) }));
mock.module('@/features/Massar/hooks/useMassar', () => ({ useMassarRead: () => ({ data: detail, error: null }), useMassarAction: () => ({ run: () => {}, pending: false }), massarPut: () => {}, massarPost: () => {} }));
const { MassarPaper } = await import('@/features/Massar/components/MassarPaper');
const options = { language: 'ar', title: 'Notes', student: 'Student', teacher: 'Teacher', maxMark: '/', term: 'Term', exam: 'Exam' };
const html = () => renderToStaticMarkup(<MassarPaper id="sheet" options={options} onBusy={() => {}} />);
const teacher = html();
assert.match(teacher, /dir="rtl"/); assert.match(teacher, /01-01-2018/); assert.match(teacher, /value="مبرر"/);
assert.doesNotMatch(teacher, /data-row="0"[^>]*disabled=""/); assert.doesNotMatch(teacher, /إرسال|حفظ النقط/);
role = 'supervisor'; detail.canEdit = false;
assert.match(html(), /<iframe/); assert.match(html(), /data-row="0"[^>]*disabled=""/);
role = 'registrar'; detail.sheet.status = 'exported'; detail.canReopen = true;
assert.match(html(), /إعادة فتح/); assert.match(html(), /data-row="0"[^>]*disabled=""/);
role = 'teacher'; detail.canReopen = false;
assert.doesNotMatch(html(), /إعادة فتح/);
console.log('Massar paper entry, phone fields and sent-sheet controls render correctly');
