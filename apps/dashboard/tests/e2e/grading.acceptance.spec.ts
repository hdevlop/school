import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  captureWrites,
  mockApi,
  signInAs,
} from './support/acceptance';

/**
 * Entering grades is School's second workflow screen. Like the register it
 * holds edits as a draft and saves them in one go, but it adds a gate the
 * register does not have: marks belong to a particular assessment or exam, so
 * nothing can be entered until one is chosen.
 *
 * The percentage column is the screen's only derived value, and the pass
 * threshold it is coloured against is the reason it exists, so both are
 * asserted against marks this test set.
 */
test.describe.configure({ mode: 'serial' });

const CLASS = { id: 'acceptance-class-1', name: 'Grade 5A' };
const SECTION = { id: 'acceptance-section-1', name: 'A', classId: CLASS.id };
const SUBJECT = { id: 'acceptance-subject-1', code: 'MATH-5', name: 'Mathematics' };
const TEACHER = {
  id: 'acceptance-teacher-1',
  name: 'Nadia Chraibi',
  email: 'nadia@school.test',
  assignments: [{ classId: CLASS.id, sectionIds: [SECTION.id], subjectIds: [SUBJECT.id] }],
};

const ASSESSMENT = {
  id: 'acceptance-assessment-1',
  title: 'Term One Quiz',
  totalMarks: 60,
  type: 'quiz',
  classId: CLASS.id,
  sectionId: SECTION.id,
  subjectId: SUBJECT.id,
  teacherId: TEACHER.id,
};

const student = (index: number, name: string, gender: 'F' | 'M') => ({
  id: `acceptance-student-${index}`,
  studentCode: `ACC-000${index}`,
  name,
  gender,
  status: 'active',
  sectionId: SECTION.id,
  class: { id: CLASS.id, name: CLASS.name },
  section: { id: SECTION.id, name: SECTION.name },
  image: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const STUDENTS = [student(1, 'Amina Benali', 'F'), student(2, 'Bilal Haddad', 'M')];

// 45 out of 60 is 75%, the first mark the screen colours as a comfortable pass.
const EXISTING_GRADES = [
  {
    id: 'acceptance-grade-1',
    studentId: STUDENTS[0].id,
    assessmentId: ASSESSMENT.id,
    examId: null,
    classId: CLASS.id,
    sectionId: SECTION.id,
    subjectId: SUBJECT.id,
    teacherId: TEACHER.id,
    marksObtained: 45,
    status: 'graded',
    feedback: '',
  },
];

async function withGradebook(page: Page, grades: unknown[] = EXISTING_GRADES) {
  await mockApi(page, '/classes', [CLASS]);
  await mockApi(page, '/sections', [SECTION]);
  await mockApi(page, '/students', STUDENTS);
  await mockApi(page, '/subjects', [SUBJECT]);
  await mockApi(page, '/teachers', [TEACHER]);
  await mockApi(page, '/assessments', [ASSESSMENT]);
  await mockApi(page, '/exams', []);
  await mockApi(page, '/grades', grades);
}

const pick = async (page: Page, control: string | RegExp, option: string | RegExp) => {
  await page.getByRole('combobox').filter({ hasText: control }).click();
  await page.getByRole('option', { name: option }).click();
};

/**
 * The comboboxes have no accessible names — their placeholders are child nodes
 * rather than labels — so each is found by the text it shows, and the source
 * options carry the marks the assessment is out of.
 */
async function chooseAssessment(page: Page) {
  await pick(page, 'Select assessment', `${ASSESSMENT.title} /${ASSESSMENT.totalMarks}`);
}

const row = (page: Page, student: string) =>
  page.locator('[data-slot="table-row"]', { hasText: student });

test('nothing can be graded until an assessment is chosen', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/grades',
    setup: (p) => withGradebook(p, []),
  });

  await expect(page.getByRole('heading', { name: 'Grades' })).toBeVisible();

  // The roster loads from the auto-selected class and section, but saving is
  // refused until the marks have something to belong to.
  await expect(page.getByText('Amina Benali')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select an assessment or exam first' })).toBeDisabled();

  await chooseAssessment(page);
  // Choosing one names it beside the count and stops gating the save.
  await expect(page.getByText(ASSESSMENT.title, { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save grades' })).toBeVisible();

  await close();
});

test('choosing an assessment fills in the subject and teacher it belongs to, and stays chosen', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/grades',
    setup: (p) => withGradebook(p, []),
  });
  await expect(page.getByText('Amina Benali')).toBeVisible();

  // Picked with the subject and teacher filters still empty. Choosing a source
  // back-fills them from it, and that back-fill used to trip the effect that
  // clears the source on a filter change — discarding the selection on the
  // spot, so the screen could only be used by filling those filters first.
  await chooseAssessment(page);

  await expect(page.getByText(ASSESSMENT.title, { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save grades' })).toBeVisible();
  await expect(page.getByRole('combobox').filter({ hasText: SUBJECT.code })).toBeVisible();
  await expect(page.getByRole('combobox').filter({ hasText: TEACHER.name })).toBeVisible();

  await close();
});

test('an existing mark is shown out of the total and as a percentage', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/grades',
    setup: (p) => withGradebook(p),
  });
  await expect(page.getByText('Amina Benali')).toBeVisible();
  await chooseAssessment(page);

  const graded = row(page, 'Amina Benali');
  await expect(graded).toContainText('45');
  await expect(graded).toContainText('/ 60');
  await expect(graded).toContainText('75%');

  // The student with no mark yet is shown as ungraded rather than as a zero.
  const ungraded = row(page, 'Bilal Haddad');
  await expect(ungraded).toContainText('—');

  await close();
});

test('a mark typed into the roster is saved with the assessment it belongs to', async ({ browser }) => {
  let sent: Record<string, any>[] = [];
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/grades',
    setup: async (p) => {
      await withGradebook(p, []);
      sent = await captureWrites(p, '/grades', 'POST', { id: 'acceptance-grade-new' });
    },
  });
  await expect(page.getByText('Amina Benali')).toBeVisible();
  await chooseAssessment(page);

  // The marks cell turns into an input on click and commits on Enter.
  await row(page, 'Amina Benali').getByText('—').first().click();
  const editor = page.locator('input:focus');
  await editor.fill('30');
  await editor.press('Enter');

  // Half of sixty, and the draft shows it before anything is saved.
  await expect(row(page, 'Amina Benali')).toContainText('50%');
  await expect(sent).toHaveLength(0);

  await page.getByRole('button', { name: 'Save grades' }).click();

  await expect.poll(() => sent.length, { message: 'the mark should be saved' }).toBe(1);
  expect(sent[0]).toMatchObject({
    studentId: STUDENTS[0].id,
    assessmentId: ASSESSMENT.id,
    classId: CLASS.id,
    sectionId: SECTION.id,
    subjectId: SUBJECT.id,
    teacherId: TEACHER.id,
    // The number editor sends a number, not the text that was typed.
    marksObtained: 30,
    status: 'graded',
  });
  // Only the student whose mark changed is sent.
  expect(sent).toHaveLength(1);

  await close();
});
