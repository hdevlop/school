'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MassarGradeSource, MassarMark, MassarSheetDetail } from '@sms/contracts';
import { useMassarRead, massarPut } from '@/features/Massar/hooks/useMassar';
import { useAcademicYearScope } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { withAcademicYear, yearScopedKey } from '@/features/AcademicYears/utils/yearScope';

export function useMassarGrades(sourceId: string, enabled: boolean) {
  const sources = useMassarRead<MassarGradeSource[]>('/grade-sources', enabled);
  const source = enabled ? sources.data?.find(item => item.id === sourceId) : undefined;
  const sheet = useMassarRead<MassarSheetDetail>(`/sheets/${encodeURIComponent(source?.sheetId ?? '')}`, !!source);
  const scope = useAcademicYearScope();
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (input: { sheetId: string; revision: number; marks: MassarMark[] }) => withAcademicYear(scope.academicYear,
      () => massarPut(`/sheets/${encodeURIComponent(input.sheetId)}/marks`, { revision: input.revision, marks: input.marks })),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['massar'] }),
        client.invalidateQueries({ queryKey: ['grades'] }),
      ]);
    },
    // A conflicting revision keeps the draft and fetches the sheet to review before retrying.
    onError: async (_error, input) => {
      await client.invalidateQueries({ queryKey: yearScopedKey('massar', scope, `/sheets/${encodeURIComponent(input.sheetId)}`) });
    },
  });
  return {
    sources: { ...sources, data: enabled ? sources.data : null, error: enabled ? sources.error : null },
    source, sheet, save: save.mutateAsync, isSaving: save.isPending,
  };
}
