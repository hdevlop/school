'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MassarFollowUpAnalysis } from '@sms/contracts';
import { useAcademicYearScope } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { withAcademicYear, yearScopedKey, type YearScope } from '@/features/AcademicYears/utils/yearScope';
import { NOTES_MASSAR_API } from '@/features/Grades/hooks/useMassarGrades';
import { massarPut, useMassarRead } from '@/features/Massar/hooks/useMassar';

const SAVE_AFTER_MS = 800;
const analysisPath = (sheetId: string) => `/sheets/${encodeURIComponent(sheetId)}/analyses`;

type Write = { scope: YearScope; sheetId: string; studentId: string; analysis: string | null };
type Draft = { write: Write; status: 'saving' | 'saved' | 'failed' };
type Pending = { draft: Draft; timer: ReturnType<typeof setTimeout> };

export function useFollowUpAnalyses(sheetId: string | undefined) {
  const scope = useAcademicYearScope();
  const client = useQueryClient();
  const read = useMassarRead<MassarFollowUpAnalysis[]>(analysisPath(sheetId ?? ''), !!sheetId, 0, NOTES_MASSAR_API);
  const saved = useMemo(() => new Map(read.data?.map(item => [item.studentId, item.analysis])), [read.data]);
  const { mutateAsync } = useMutation({
    // A later edit or reset must reach the server after any write already in flight.
    scope: { id: 'massar-follow-up-analyses' },
    mutationFn: (write: Write) => withAcademicYear(write.scope.academicYear,
      () => massarPut(analysisPath(write.sheetId), { studentId: write.studentId, analysis: write.analysis }, NOTES_MASSAR_API)),
    onSuccess: async (_result, write) => {
      const queryKey = yearScopedKey('massar', write.scope, NOTES_MASSAR_API + analysisPath(write.sheetId));
      await client.cancelQueries({ queryKey, exact: true });
      client.setQueryData<{ data: MassarFollowUpAnalysis[] }>(queryKey, (previous) => {
        if (!previous) return previous;
        const analyses = previous.data.filter(item => item.studentId !== write.studentId);
        if (write.analysis !== null) analyses.push({ studentId: write.studentId, analysis: write.analysis });
        return { ...previous, data: analyses };
      });
    },
  });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const pending = useRef(new Map<string, Pending>());
  const keyOf = (studentId: string) => JSON.stringify([scope.accountScope, scope.academicYear, sheetId, studentId]);

  const flush = useCallback((key: string) => {
    const item = pending.current.get(key);
    if (!item) return;
    clearTimeout(item.timer);
    pending.current.delete(key);
    const settle = (status: 'saved' | 'failed') => setDrafts(current => current[key] !== item.draft
      ? current : { ...current, [key]: { ...item.draft, status } });
    void mutateAsync(item.draft.write).then(() => settle('saved'), () => settle('failed'));
  }, [mutateAsync]);

  // Keep a draft tied to its sheet and year even when the teacher goes back during the pause.
  useEffect(() => {
    const queued = pending.current;
    return () => { for (const key of queued.keys()) flush(key); };
  }, [flush]);

  const change = (studentId: string, analysis: string | null, immediate = false) => {
    if (!sheetId || !scope.ready) return;
    const key = keyOf(studentId);
    clearTimeout(pending.current.get(key)?.timer);
    const draft: Draft = { write: { scope, sheetId, studentId, analysis }, status: 'saving' };
    setDrafts(current => ({ ...current, [key]: draft }));
    pending.current.set(key, { draft, timer: setTimeout(() => flush(key), SAVE_AFTER_MS) });
    if (immediate) flush(key);
  };

  const entry = (studentId: string) => {
    const draft = drafts[keyOf(studentId)];
    const value = draft && draft.status !== 'saved' ? draft.write.analysis : saved.get(studentId);
    return { value, status: draft?.status };
  };
  const retry = (studentId: string) => {
    const draft = drafts[keyOf(studentId)];
    if (draft?.status === 'failed') change(studentId, draft.write.analysis, true);
  };

  return { read, entry, change, retry, flush: (studentId: string) => flush(keyOf(studentId)) };
}
