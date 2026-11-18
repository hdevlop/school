'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { Check, CheckCheck, CircleDashed, Search, X, type LucideIcon } from 'lucide-react';
import { HOMEWORK_COMPLETION_NOTE_MAX, HOMEWORK_COMPLETION_STATUS_VALUES, type HomeworkCompletionStatus, type HomeworkRow } from '@sms/contracts';
import { Input, NAvatar, NButton, NErrorState, NLoadingState, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useDialog } from '@/shared/useDialog';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { completionDraft, completionEntries, personInitials, type CompletionDraft } from '../config/homeworkCompletion';
import { useHomeworkRoster } from '../hooks/useHomework';
import { homeworkPlacementLabel } from './HomeworkCard';

export const HOMEWORK_COMPLETION_FORM_ID = 'homework-completion-form';

/** From this many pupils the list offers a name filter. */
const SEARCH_FROM = 12;

// Each status keeps one color everywhere: the chosen button, the summary, the row.
const STATUS_LOOK: Record<HomeworkCompletionStatus, { icon: LucideIcon; chosen: string; chip: string; row: string }> = {
  done: {
    icon: Check,
    chosen: 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    row: '',
  },
  incomplete: {
    icon: CircleDashed,
    chosen: 'border-amber-500 bg-amber-500 text-white',
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    row: 'bg-amber-500/5',
  },
  not_done: {
    icon: X,
    chosen: 'border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-500',
    chip: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    row: 'bg-red-500/5',
  },
};

/** Three buttons, one chosen: a radio group a thumb can hit and a glance can read. */
function StatusPicker({ value, onChange, label }: { value: HomeworkCompletionStatus; onChange: (status: HomeworkCompletionStatus) => void; label: string }) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 gap-1">
      {HOMEWORK_COMPLETION_STATUS_VALUES.map((status) => {
        const look = STATUS_LOOK[status];
        const Icon = look.icon;
        const chosen = value === status;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={chosen}
            onClick={() => onChange(status)}
            className={cn(
              'inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              chosen ? look.chosen : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {t(`homework.completion.status.${status}`)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The follow-up of one homework: every pupil it was given to, done by
 * default. The teacher marks who did not do it, or not all of it, with an
 * optional remark. Submitting hands every pupil's entry to the dialog.
 */
export default function HomeworkCompletionForm({ homework }: { homework: HomeworkRow }) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { displayDateOnly } = useSchoolFormat();
  const { roster, isLoading, error } = useHomeworkRoster(homework.id);
  const [draft, setDraft] = useState<CompletionDraft | null>(null);
  const [query, setQuery] = useState('');

  // The roster arrives once; the draft starts from it and is the teacher's after.
  useEffect(() => {
    if (!draft && !isLoading && roster) setDraft(completionDraft(roster));
  }, [draft, isLoading, roster]);

  const counts = useMemo(() => {
    const rows = Object.values(draft ?? {});
    return Object.fromEntries(HOMEWORK_COMPLETION_STATUS_VALUES.map((status) => [status, rows.filter((row) => row.status === status).length])) as Record<HomeworkCompletionStatus, number>;
  }, [draft]);

  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle ? roster.filter((entry) => entry.name.toLocaleLowerCase().includes(needle)) : roster;
  }, [roster, query]);

  if (error) return <NErrorState surface="panel" />;
  if (isLoading || !draft) return <NLoadingState surface="panel" label={t('common.loading')} className="min-h-40" />;

  const set = (studentId: string, change: Partial<CompletionDraft[string]>) =>
    setDraft((current) => ({ ...current, [studentId]: { ...current![studentId], ...change } }));
  const allDone = () => setDraft((current) => Object.fromEntries(Object.entries(current!).map(([id, row]) => [id, { ...row, status: 'done' as const }])));

  const placement = homeworkPlacementLabel(homework);

  return (
    <form
      id={HOMEWORK_COMPLETION_FORM_ID}
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        pop({ id: homework.id, entries: completionEntries(roster, draft) });
      }}
    >
      <div className="flex flex-col gap-1">
        <div className="font-semibold">{homework.title}</div>
        <div className="text-sm text-muted-foreground">
          {[homework.subject?.name, homework.subSubject, placement, displayDateOnly(homework.date)].filter(Boolean).join(' · ')}
        </div>
      </div>

      <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{t('homework.completion.hint')}</p>

      {roster.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('homework.completion.empty')}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5" aria-live="polite">
              {HOMEWORK_COMPLETION_STATUS_VALUES.map((status) => (
                <span key={status} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums', STATUS_LOOK[status].chip)}>
                  {t(`homework.completion.status.${status}`)}
                  <span className="font-bold">{counts[status]}</span>
                </span>
              ))}
            </div>
            <NButton type="button" size="sm" variant="outline" onClick={allDone} disabled={counts.done === roster.length}>
              <CheckCheck className="h-4 w-4" aria-hidden />
              {t('homework.completion.allDone')}
            </NButton>
          </div>

          {roster.length >= SEARCH_FROM && (
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('homework.completion.search')}
                aria-label={t('homework.completion.search')}
                className="ps-9"
              />
            </div>
          )}

          <ul className="flex flex-col divide-y rounded-lg border">
            {shown.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">{t('homework.completion.noMatch')}</li>}
            {shown.map((entry, index) => {
              const row = draft[entry.studentId];
              const missed = row.status !== 'done';
              return (
                <li key={entry.studentId} className={cn('flex flex-col gap-2 px-3 py-2.5 transition-colors', STATUS_LOOK[row.status].row)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-5 shrink-0 text-end text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                      <NAvatar src={entry.image} fallback={personInitials(entry.name)} size="sm" />
                      <span className="truncate text-sm font-medium">{entry.name}</span>
                    </div>
                    <StatusPicker
                      value={row.status}
                      onChange={(status) => set(entry.studentId, { status })}
                      label={`${t('homework.completion.label')} — ${entry.name}`}
                    />
                  </div>
                  {(missed || row.note) && (
                    <Input
                      value={row.note}
                      maxLength={HOMEWORK_COMPLETION_NOTE_MAX}
                      placeholder={t('homework.completion.notePlaceholder')}
                      aria-label={`${t('homework.completion.notePlaceholder')} — ${entry.name}`}
                      onChange={(event) => set(entry.studentId, { note: event.target.value })}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </form>
  );
}
