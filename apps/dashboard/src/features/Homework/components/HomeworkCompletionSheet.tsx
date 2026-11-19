'use client'

import { useMemo, useState } from 'react';
import { Check, CheckCheck, CircleDashed, ClipboardCheck, Search, X, type LucideIcon } from 'lucide-react';
import { HOMEWORK_COMPLETION_STATUS_VALUES, type HomeworkCompletionStatus, type HomeworkRow } from '@sms/contracts';
import { Input, NAvatar, NButton, NErrorState, NLoadingState, NSheet, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { personInitials } from '../config/homeworkCompletion';
import { useHomeworkRoster } from '../hooks/useHomework';
import { useHomeworkCompletionAutosave } from '../hooks/useHomeworkCompletionAutosave';
import { homeworkPlacementLabel } from './HomeworkCard';

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
    <div role="radiogroup" aria-label={label} className="flex shrink-0 gap-1 md:max-w-full md:shrink md:flex-wrap">
      {HOMEWORK_COMPLETION_STATUS_VALUES.map((status) => {
        const look = STATUS_LOOK[status];
        const Icon = look.icon;
        const chosen = value === status;
        const statusLabel = t(`homework.completion.status.${status}`);
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-label={statusLabel}
            aria-checked={chosen}
            title={statusLabel}
            onClick={() => onChange(status)}
            className={cn(
              'inline-flex size-10 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8 md:w-auto md:gap-1 md:px-2.5',
              chosen ? look.chosen : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0 md:size-3.5" aria-hidden />
            <span className="hidden md:inline">{statusLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The follow-up of one homework: every pupil it was given to, done by
 * default. The teacher marks exceptions, and a failed save keeps the draft open.
 */
export default function HomeworkCompletionSheet({ homework, onClose }: { homework: HomeworkRow; onClose: () => void }) {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();
  const { roster, isLoading, error } = useHomeworkRoster(homework.id);
  const { edits, state, change, flush } = useHomeworkCompletionAutosave(homework.id, roster);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState('');

  const statuses = useMemo(() => Object.fromEntries(
    roster.map(({ studentId, status }) => [studentId, edits.get(studentId)?.status ?? status ?? 'done']),
  ), [roster, edits]);

  const counts = useMemo(() => {
    const rows = Object.values(statuses);
    return Object.fromEntries(HOMEWORK_COMPLETION_STATUS_VALUES.map((status) => [status, rows.filter((value) => value === status).length])) as Record<HomeworkCompletionStatus, number>;
  }, [statuses]);

  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle ? roster.filter((entry) => entry.name.toLocaleLowerCase().includes(needle)) : roster;
  }, [roster, query]);

  const allDone = () => change(roster.filter((entry) => entry.status !== 'done' || statuses[entry.studentId] !== 'done')
    .map(({ studentId }) => ({ studentId, status: 'done' })));
  const hasUnreviewed = roster.some((entry) => entry.status === null && !edits.has(entry.studentId));
  const close = async () => {
    if (closing || state === 'failed') return;
    setClosing(true);
    if (await flush()) onClose();
    else setClosing(false);
  };
  const content = (
    <fieldset disabled={closing} className="flex min-w-0 flex-col gap-2">
      <h3 dir="auto" className="wrap-anywhere font-semibold">{homework.title}</h3>

      {roster.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('homework.completion.empty')}</p>
      ) : (
        <>
          <div className="sticky top-0 z-10 grid gap-2 bg-background py-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5" aria-live="polite">
                {HOMEWORK_COMPLETION_STATUS_VALUES.map((status) => (
                  <span key={status} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums', STATUS_LOOK[status].chip)}>
                    {t(`homework.completion.status.${status}`)}
                    <span className="font-bold">{counts[status]}</span>
                  </span>
                ))}
              </div>
              <NButton type="button" size="sm" variant="outline" onClick={allDone} disabled={counts.done === roster.length && !hasUnreviewed}>
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
          </div>

          <ul className="flex flex-col divide-y overflow-hidden rounded-lg border bg-card text-card-foreground">
            {shown.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">{t('homework.completion.noMatch')}</li>}
            {shown.map((entry, index) => {
              const status = statuses[entry.studentId];
              return (
                <li key={entry.studentId} className={cn('flex items-center justify-between gap-2 px-2 py-1.5 transition-colors md:flex-wrap md:px-3 md:py-2.5', STATUS_LOOK[status].row)}>
                  <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
                    <span className="w-4 shrink-0 text-end text-xs tabular-nums text-muted-foreground md:w-5">{index + 1}</span>
                    <NAvatar src={entry.image} fallback={personInitials(entry.name)} size="sm" className="shrink-0" />
                    <bdi className="line-clamp-2 wrap-anywhere text-sm leading-tight font-medium md:line-clamp-none md:truncate md:leading-normal" title={entry.name}>{entry.name}</bdi>
                  </div>
                  <StatusPicker
                    value={status}
                    onChange={(next) => {
                      if (next !== status || entry.status === null) change([{ studentId: entry.studentId, status: next }]);
                    }}
                    label={`${t('homework.completion.label')} — ${entry.name}`}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </fieldset>
  );

  return (
    <NSheet
      open
      onOpenChange={(open) => { if (!open) void close(); }}
      icon={ClipboardCheck}
      title={t('homework.completion.title')}
      description={[homework.subject?.name, homework.subSubject, homeworkPlacementLabel(homework), displayDateOnly(homework.date)].filter(Boolean).join(' · ')}
      width={760}
      footer={state === 'failed' ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="alert" className="text-sm text-destructive">{t('homework.completion.autosaveFailed')}</p>
          <div className="ms-auto flex flex-wrap gap-2">
            <NButton type="button" variant="outline" onClick={onClose}>{t('homework.completion.discardUnsaved')}</NButton>
            <NButton type="button" onClick={() => void flush()}>{t('homework.completion.retry')}</NButton>
          </div>
        </div>
      ) : undefined}
    >
      {error ? <NErrorState surface="panel" /> : isLoading
        ? <NLoadingState surface="panel" label={t('common.loading')} className="min-h-40" />
        : content}
    </NSheet>
  );
}
