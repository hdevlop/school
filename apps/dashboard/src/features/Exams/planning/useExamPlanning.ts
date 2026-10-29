'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExamPlanningClass, ExamPlanningEntry, ExamPlanningJson } from '@sms/contracts';
import { api } from '@/services/http';
import { useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';

export function useExamPlanning() {
  const queryClient = useQueryClient();
  const list = useYearScopedList({ resource: 'exam-planning', fetch: async () => (await api.get('/exam-planning')).data });
  const mutation = useMutation({
    mutationFn: (data: { classId: string; month: string; entries: ExamPlanningEntry[] } | { classIds: string[] } | { document: ExamPlanningJson } | { clear: true }) =>
      withAcademicYear(list.academicYear, async () => {
        const { data: result } = 'clear' in data
          ? await api.delete('/exam-planning')
          : 'document' in data
          ? await api.put('/exam-planning/import', data)
          : 'classIds' in data
          ? await api.put('/exam-planning/visibility', data)
          : await api.put(`/exam-planning/${encodeURIComponent(data.classId)}`, { month: data.month, entries: data.entries });
        return result;
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam-planning'] }),
  });
  return { ...list, classes: list.data as ExamPlanningClass[], save: mutation.mutateAsync, isSaving: mutation.isPending };
}
