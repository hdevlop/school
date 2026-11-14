'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MassarGradeSource, MassarMark, MassarSheetDetail } from '@sms/contracts';
import { useMassarRead, massarPut } from '@/features/Massar/hooks/useMassar';
import { useAcademicYearScope } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { withAcademicYear, yearScopedKey } from '@/features/AcademicYears/utils/yearScope';

/** Notes reaches Massar's grids through its own routes and permissions (read:grades, update:grades). */
export const NOTES_MASSAR_API = '/massar-grades' as const;

export function useMassarGrades(sourceId: string, enabled: boolean) {
  const sources = useMassarRead<MassarGradeSource[]>('/sources', enabled, 0, NOTES_MASSAR_API);
  const source = enabled ? sources.data?.find(item => item.id === sourceId) : undefined;
  const sheet = useMassarRead<MassarSheetDetail>(`/sheets/${encodeURIComponent(source?.sheetId ?? '')}`, !!source, 0, NOTES_MASSAR_API);
  const scope = useAcademicYearScope();
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (input: { sheetId: string; revision: number; marks: MassarMark[] }) => withAcademicYear(scope.academicYear,
      () => massarPut(`/sheets/${encodeURIComponent(input.sheetId)}/marks`, { revision: input.revision, marks: input.marks }, NOTES_MASSAR_API)),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['massar'] }),
        client.invalidateQueries({ queryKey: ['grades'] }),
      ]);
    },
    // A conflicting revision keeps the draft and fetches the sheet to review before retrying.
    onError: async (_error, input) => {
      await client.invalidateQueries({ queryKey: yearScopedKey('massar', scope, `${NOTES_MASSAR_API}/sheets/${encodeURIComponent(input.sheetId)}`) });
    },
  });
  return {
    sources: { ...sources, data: enabled ? sources.data : null, error: enabled ? sources.error : null },
    source, sheet, save: save.mutateAsync, isSaving: save.isPending,
  };
}
