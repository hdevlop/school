'use client';

import { useRef, useState } from 'react';
import { HOMEWORK_COMPLETION_BATCH_MAX, type HomeworkCompletionEntry, type HomeworkRosterEntry } from '@sms/contracts';
import { useAcademicYearScope } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { queueCompletionEntries } from '../config/homeworkCompletion';
import { useSaveHomeworkCompletions } from './useHomework';

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

export function useHomeworkCompletionAutosave(id: string, roster: HomeworkRosterEntry[]) {
  const scope = useAcademicYearScope();
  const { mutateAsync } = useSaveHomeworkCompletions(id);
  const pending = useRef(new Map<string, HomeworkCompletionEntry>());
  const request = useRef<Promise<boolean> | null>(null);
  const [edits, setEdits] = useState(() => new Map<string, HomeworkCompletionEntry>());
  const [state, setState] = useState<SaveState>('idle');

  async function savePending() {
    setState('saving');
    while (pending.current.size > 0) {
      const entries = Array.from(pending.current.values()).slice(0, HOMEWORK_COMPLETION_BATCH_MAX);
      try {
        await mutateAsync({ id, entries, scope });
      } catch {
        setState('failed');
        return false;
      }
      for (const entry of entries) {
        // Keep any edit made while this request was in flight.
        if (pending.current.get(entry.studentId) === entry) pending.current.delete(entry.studentId);
      }
      setEdits(new Map(pending.current));
    }
    setState('saved');
    return true;
  }

  function flush() {
    if (request.current) return request.current;
    if (!pending.current.size) return Promise.resolve(true);
    request.current = savePending().finally(() => { request.current = null; });
    return request.current;
  }

  /** Saves the edits, recording the default for the unchecked pupils of `defaultsFor` (the roster given). */
  function change(entries: HomeworkCompletionEntry[], defaultsFor: readonly HomeworkRosterEntry[] = roster) {
    if (!scope.ready) return;
    pending.current = queueCompletionEntries(defaultsFor, pending.current, entries);
    setEdits(new Map(pending.current));
    void flush();
  }

  return { edits, state, change, flush };
}
