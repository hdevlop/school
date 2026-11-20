'use client';

import { useState } from 'react';
import { ListChecks } from 'lucide-react';
import { cn, NErrorState } from 'najm-kit';
import { PART_PRIORITY_RATE, type ClassPart } from '../config/partCounts';

type T = (key: string, params?: Record<string, unknown>) => string;
type Status = 'saving' | 'saved' | 'failed' | undefined;

/**
 * Where the teacher enters, under the class report's own heading, how many of
 * the pupils who sat the Contrôle answered each question of its School test
 * correctly. Each count is saved a moment after typing; the report's page does
 * not show them.
 */
export function PartCounts({ parts, marked, t, statusOf, onChange, onBlur, onRetry, error, loading, onReload }: {
  parts: readonly ClassPart[];
  marked: number;
  t: T;
  statusOf: (part: ClassPart) => Status;
  onChange: (part: ClassPart, correct: number | null) => void;
  onBlur: (part: ClassPart) => void;
  onRetry: (part: ClassPart) => void;
  error: boolean;
  loading: boolean;
  onReload: () => void;
}) {
  if (error) return <NErrorState surface="panel" title={t('competencies.classReport.parts')} onRetry={onReload} />;
  if (loading) return null;
  // No questions on the test yet: say where they are listed, rather than show nothing.
  if (!parts.length) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
        <ListChecks className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t('competencies.classReport.noQuestions')}
      </p>
    );
  }
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-3" aria-labelledby="part-counts-title">
      <header className="flex flex-col gap-0.5">
        <h3 id="part-counts-title" className="flex items-center gap-1.5 text-sm font-semibold">
          <ListChecks className="size-4 text-muted-foreground" aria-hidden="true" />
          {t('competencies.classReport.parts')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('competencies.classReport.partsHint')}</p>
      </header>
      <ul className="flex flex-col divide-y divide-border/60">
        {parts.map((part) => (
          <PartRow key={part.key} part={part} marked={marked} t={t} status={statusOf(part)}
            onChange={(correct) => onChange(part, correct)} onBlur={() => onBlur(part)} onRetry={() => onRetry(part)} />
        ))}
      </ul>
    </section>
  );
}

function PartRow({ part, marked, t, status, onChange, onBlur, onRetry }: {
  part: ClassPart; marked: number; t: T; status: Status;
  onChange: (correct: number | null) => void; onBlur: () => void; onRetry: () => void;
}) {
  // What the teacher typed, kept while it is not a count yet (e.g. above the pupils who sat).
  const [text, setText] = useState(part.correct == null ? '' : String(part.correct));
  const value = text.trim();
  const count = value === '' ? null : Number(value);
  const invalid = count !== null && (!Number.isInteger(count) || count < 0 || count > marked);
  const low = part.rate != null && part.rate < PART_PRIORITY_RATE;
  const inputId = `part-count-${part.key.replace(/[^\w-]/g, '_')}`;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <label htmlFor={inputId} className="min-w-0 flex-1 basis-40 text-sm">
        <bdi dir="auto" className="font-medium">{part.label}</bdi>
      </label>
      <span className="flex items-center gap-1.5 text-sm tabular-nums">
        <input id={inputId} type="number" inputMode="numeric" min={0} max={marked} step={1} value={text}
          aria-invalid={invalid || undefined} aria-describedby={`${inputId}-of`}
          className={cn('h-9 w-16 rounded-md border bg-background px-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
            invalid ? 'border-destructive text-destructive' : 'border-input')}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setText(next);
            const trimmed = next.trim();
            const parsed = trimmed === '' ? null : Number(trimmed);
            if (parsed === null || (Number.isInteger(parsed) && parsed >= 0 && parsed <= marked)) onChange(parsed);
          }}
          onBlur={onBlur} />
        <span id={`${inputId}-of`} className="text-muted-foreground">/ {marked}</span>
      </span>
      <span className={cn('w-12 text-end text-sm font-semibold tabular-nums', low ? 'text-destructive' : 'text-foreground')}>
        {part.rate == null || invalid ? '—' : `${part.rate}%`}
      </span>
      <span role="status" className="w-24 text-xs text-muted-foreground">
        {status === 'saving' ? t('competencies.remark.saving')
          : status === 'saved' ? `✓ ${t('competencies.remark.saved')}`
            : status === 'failed' ? (
              <button type="button" className="text-destructive underline underline-offset-2" onClick={onRetry}>
                {t('competencies.classReport.partsSaveFailed')} {t('competencies.save.retry')}
              </button>
            ) : null}
      </span>
    </li>
  );
}
