import { describe, expect, it } from 'bun:test';
import { eligibleAssessmentTeachers } from '@/features/Assessments/config/assessmentTeachers';

const assignment = (classId: string, sectionIds: string[], subjectIds: string[]) => ({ classId, sectionIds, subjectIds });
const teachers = [
  { id: 'both', assignments: [assignment('class', ['A'], ['math']), assignment('class', ['B'], ['math'])] },
  { id: 'only-a', assignments: [assignment('class', ['A'], ['math'])] },
  { id: 'different-subject-in-b', assignments: [assignment('class', ['A'], ['math']), assignment('class', ['B'], ['arabic'])] },
  { id: 'different-class', assignments: [assignment('other', ['A', 'B'], ['math'])] },
  { id: 'unassigned', assignments: [] },
];

describe('assessment teacher eligibility', () => {
  it('requires the chosen subject in every selected section', () => {
    expect(eligibleAssessmentTeachers(teachers, 'class', ['A', 'B'], 'math').map((t) => t.id)).toEqual(['both']);
  });

  it('does not invent subject/section combinations across assignments', () => {
    expect(eligibleAssessmentTeachers(teachers, 'class', ['B'], 'math').map((t) => t.id)).toEqual(['both']);
    expect(eligibleAssessmentTeachers(teachers, 'class', ['B'], 'arabic').map((t) => t.id)).toEqual(['different-subject-in-b']);
  });

  it('waits for the full academic context', () => {
    expect(eligibleAssessmentTeachers(teachers, '', ['A'], 'math')).toEqual([]);
    expect(eligibleAssessmentTeachers(teachers, 'class', [], 'math')).toEqual([]);
    expect(eligibleAssessmentTeachers(teachers, 'class', ['A'], '')).toEqual([]);
  });
});
