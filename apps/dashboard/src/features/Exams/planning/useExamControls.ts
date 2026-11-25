'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExamControl, ExamControlInput } from '@sms/contracts';
import { api } from '@/services/http';
import { useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';

/**
 * The year's Contrôles (GET /exam-planning/controls): the saved ones, or
 * Planning's months until one is saved (`derived`). Opening, changing or
 * removing one refreshes Planning, the exams and Massar, which all follow them.
 */
/** Opening one Contrôle or several (all or none), changing one, or removing one. */
export type ExamControlChange = { create: ExamControlInput } | { createMany: ExamControlInput[] } | { id: string; update: ExamControlInput } | { id: string; remove: true };

export function useExamControls(enabled = true) {
  const queryClient = useQueryClient();
  const list = useYearScopedList({ resource: 'exam-planning', parts: ['controls'], fetch: async () => (await api.get('/exam-planning/controls')).data, enabled });
  const refresh = () => Promise.all(['exam-planning', 'exams', 'massar'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
  const mutation = useMutation({
    mutationFn: (change: ExamControlChange) =>
      withAcademicYear(list.academicYear, async () => {
        const { data } = 'createMany' in change ? await api.post('/exam-planning/controls/many', { controls: change.createMany })
          : 'create' in change ? await api.post('/exam-planning/controls', change.create)
          : 'update' in change ? await api.put(`/exam-planning/controls/${encodeURIComponent(change.id)}`, change.update)
          : await api.delete(`/exam-planning/controls/${encodeURIComponent(change.id)}`);
        return data;
      }),
    onSuccess: refresh,
  });
  return { ...list, controls: list.data as ExamControl[], change: mutation.mutateAsync, isChanging: mutation.isPending };
}
