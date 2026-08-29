import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  expectNoHorizontalOverflow,
  mockApi,
  signInAs,
} from './support/acceptance';

/**
 * An exam is the thing grades are eventually attached to, so the list has to be
 * unambiguous about which one is which: its type, the subject and teacher it
 * belongs to, and the class and sections sitting it. Where any of those is not
 * yet decided, the row has to say so rather than leave a gap.
 */
test.describe.configure({ mode: 'serial' });

const CLASS = { id: 'acceptance-class-1', name: 'Grade 5A' };
const SECTION = { id: 'acceptance-section-1', name: 'A' };

const EXAMS = [
  {
    id: 'acceptance-exam-1',
    title: 'Midterm mathematics',
    type: 'midterm',
    subject: { id: 'acceptance-subject-1', name: 'Mathematics' },
    teacher: { id: 'acceptance-teacher-1', name: 'Nadia Chraibi' },
    class: CLASS,
    section: SECTION,
    sectionIds: [SECTION.id, 'acceptance-section-2'],
    date: '2026-06-10',
    duration: 90,
    totalMarks: 100,
    passingMarks: 50,
    status: 'scheduled',
  },
  {
    id: 'acceptance-exam-2',
    title: 'Final physics',
    type: 'final',
    subject: null,
    teacher: null,
    class: CLASS,
    section: SECTION,
    sectionIds: [SECTION.id],
    date: '2026-06-18',
    duration: 120,
    totalMarks: 100,
    passingMarks: 50,
    status: 'scheduled',
  },
];

const withExams = (page: Page) => mockApi(page, '/exams', EXAMS);

const cell = (page: Page, text: string) =>
  page.locator('[data-slot="table-cell"]', { hasText: text });

test('the exam list identifies each exam by type, subject, teacher and sections', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/exams', setup: withExams });

  await expect(page.getByRole('heading', { name: 'Exams' })).toBeVisible();
  await expect(page.getByText('2 exams total')).toBeVisible();

  await expect(cell(page, 'Midterm mathematics').first()).toBeVisible();
  await expect(cell(page, 'Midterm').first()).toBeVisible();
  await expect(cell(page, 'Mathematics').first()).toBeVisible();
  await expect(cell(page, 'Nadia Chraibi').first()).toBeVisible();
  // Two sections are sitting it, and the extra one is counted rather than
  // silently dropped.
  await expect(cell(page, 'A +1').first()).toBeVisible();

  // An exam with no subject or teacher yet says so in both columns.
  await expect(cell(page, 'Final physics').first()).toBeVisible();
  await expect(cell(page, 'Final').first()).toBeVisible();
  await expect(page.getByText('Not Assigned').first()).toBeVisible();

  await close();
});

test('the exam list fits a phone viewport', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/exams',
    viewport: { width: 390, height: 844 },
    setup: withExams,
  });

  await expect(page.getByRole('heading', { name: 'Exams' })).toBeVisible();
  await expect(page.getByText('Midterm mathematics').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await close();
});
