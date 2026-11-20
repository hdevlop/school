'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MassarPartResult, MassarSheetParts } from '@sms/contracts';
import { useAcademicYearScope } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { withAcademicYear, yearScopedKey, type YearScope } from '@/features/AcademicYears/utils/yearScope';
import { NOTES_MASSAR_API } from '@/features/Grades/hooks/useMassarGrades';
import { massarPut, useMassarRead } from '@/features/Massar/hooks/useMassar';

const SAVE_AFTER_MS = 800;
const partsPath = (sheetId: string) => `/sheets/${encodeURIComponent(sheetId)}/parts`;
export const partKey = (testId: string, partId: string) => JSON.stringify([testId, partId]);

type Write = { scope: YearScope; sheetId: string; testId: string; partId: string; correct: number | null };
type Draft = { write: Write; status: 'saving' | 'saved' | 'failed' };
type Pending = { draft: Draft; timer: ReturnType<typeof setTimeout> };

/**
 * The parts of a grid's School tests and how many pupils answered each one
 * correctly, entered in the class report and saved a moment after typing.
 */
export function useSheetParts(sheetId: string | undefined) {
  const scope = useAcademicYearScope();
  const client = useQueryClient();
  const read = useMassarRead<MassarSheetParts>(partsPath(sheetId ?? ''), !!sheetId, 0, NOTES_MASSAR_API);
  const saved = useMemo(() => new Map(read.data?.results.map((item) => [partKey(item.testId, item.partId), item.correct])), [read.data]);
  const { mutateAsync } = useMutation({
    // A later count must reach the server after any write already in flight.
    scope: { id: 'massar-part-results' },
    mutationFn: (write: Write) => withAcademicYear(write.scope.academicYear,
      () => massarPut(partsPath(write.sheetId), { testId: write.testId, partId: write.partId, correct: write.correct }, NOTES_MASSAR_API)),
    onSuccess: async (_result, write) => {
      const queryKey = yearScopedKey('massar', write.scope, NOTES_MASSAR_API + partsPath(write.sheetId));
      await client.cancelQueries({ queryKey, exact: true });
      client.setQueryData<{ data: MassarSheetParts }>(queryKey, (previous) => {
        if (!previous) return previous;
        const results: MassarPartResult[] = previous.data.results.filter((item) => partKey(item.testId, item.partId) !== partKey(write.testId, write.partId));
        if (write.correct !== null) results.push({ testId: write.testId, partId: write.partId, correct: write.correct });
        return { ...previous, data: { ...previous.data, results } };
      });
    },
  });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const pending = useRef(new Map<string, Pending>());
  const keyOf = (testId: string, partId: string) => JSON.stringify([scope.accountScope, scope.academicYear, sheetId, testId, partId]);

  const flush = useCallback((key: string) => {
    const item = pending.current.get(key);
    if (!item) return;
    clearTimeout(item.timer);
    pending.current.delete(key);
    const settle = (status: 'saved' | 'failed') => setDrafts((current) => current[key] !== item.draft
      ? current : { ...current, [key]: { ...item.draft, status } });
    void mutateAsync(item.draft.write).then(() => settle('saved'), () => settle('failed'));
  }, [mutateAsync]);

  // A count typed just before leaving the report is still saved, to its own sheet and year.
  useEffect(() => {
    const queued = pending.current;
    return () => { for (const key of queued.keys()) flush(key); };
  }, [flush]);

  const change = (testId: string, partId: string, correct: number | null, immediate = false) => {
    if (!sheetId || !scope.ready) return;
    const key = keyOf(testId, partId);
    clearTimeout(pending.current.get(key)?.timer);
    const draft: Draft = { write: { scope, sheetId, testId, partId, correct }, status: 'saving' };
    setDrafts((current) => ({ ...current, [key]: draft }));
    pending.current.set(key, { draft, timer: setTimeout(() => flush(key), SAVE_AFTER_MS) });
    if (immediate) flush(key);
  };

  /** The count on screen: an unsaved draft first, then the stored one. */
  const correctOf = (testId: string, partId: string) => {
    const draft = drafts[keyOf(testId, partId)];
    return draft && draft.status !== 'saved' ? draft.write.correct : saved.get(partKey(testId, partId)) ?? null;
  };
  const statusOf = (testId: string, partId: string) => drafts[keyOf(testId, partId)]?.status;
  const retry = (testId: string, partId: string) => {
    const draft = drafts[keyOf(testId, partId)];
    if (draft?.status === 'failed') change(testId, partId, draft.write.correct, true);
  };

  return { read, parts: read.data?.parts ?? [], correctOf, statusOf, change, retry, flush: (testId: string, partId: string) => flush(keyOf(testId, partId)) };
}
