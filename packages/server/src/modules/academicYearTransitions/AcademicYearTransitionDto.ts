import { z } from 'zod';
import { isDateOnly } from '@sms/contracts/academic-years';

const id = z.string().trim().min(1);

export const previewAcademicYearTransitionDto = z.object({
  sourceAcademicYearId: id,
  enrolledOn: z.string().refine(isDateOnly, 'Expected a real YYYY-MM-DD date'),
  mappings: z.array(z.object({
    sourceSectionId: id,
    targetClassId: id,
    targetSectionId: id,
    outcome: z.enum(['promote', 'repeat']),
  })).max(10000),
  studentDecisions: z.array(z.discriminatedUnion('outcome', [
    z.object({ studentId: id, outcome: z.enum(['graduate', 'withdraw', 'omit']) }),
    z.object({
      studentId: id,
      outcome: z.enum(['promote', 'repeat']),
      targetClassId: id,
      targetSectionId: id,
    }),
  ])).max(10000).default([]),
}).superRefine((value, context) => {
  const mapped = new Set<string>();
  value.mappings.forEach((mapping, index) => {
    if (mapped.has(mapping.sourceSectionId)) {
      context.addIssue({ code: 'custom', path: ['mappings', index, 'sourceSectionId'], message: 'Source section is mapped twice' });
    }
    mapped.add(mapping.sourceSectionId);
  });
  const decided = new Set<string>();
  value.studentDecisions.forEach((decision, index) => {
    if (decided.has(decision.studentId)) {
      context.addIssue({ code: 'custom', path: ['studentDecisions', index, 'studentId'], message: 'Student has multiple decisions' });
    }
    decided.add(decision.studentId);
  });
});

export type PreviewAcademicYearTransitionDto = z.infer<typeof previewAcademicYearTransitionDto>;

export const commitAcademicYearTransitionDto = z.object({
  preview: previewAcademicYearTransitionDto,
  idempotencyKey: z.uuid(),
  expectedPreviewHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type CommitAcademicYearTransitionDto = z.infer<typeof commitAcademicYearTransitionDto>;

export const academicYearTransitionRunIdParam = z.object({ runId: id });
