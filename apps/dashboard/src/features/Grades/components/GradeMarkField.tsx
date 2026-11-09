'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { cn } from 'najm-kit';
import { GRADE_REMARK_FIELD_STYLES, gradeRemark } from '../config/gradeRemarks';

/** A pause this long in typing hands the mark to the roster. */
const SEND_AFTER_MS = 300;
const shown = (value: unknown) => (value === null || value === undefined || value === '' ? '' : String(Number(value)));

/**
 * A mark typed straight into the roster, always shown like a Massar grid cell
 * rather than a value that turns into a field on click. A valid mark (or an
 * emptied cell) goes to the draft once typing pauses or the field is left; one
 * out of range is outlined and kept back. Enter and the up and down arrows
 * move between students.
 */
export function GradeMarkField({ value, total, disabled, label, onChange }: {
  value: unknown; total: number | null | undefined; disabled?: boolean; label: string;
  onChange: (value: number | null) => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(shown(value));
  const [focused, setFocused] = useState(false);
  // Another source of the value (a reload, a saved draft) shows unless the field is being typed in.
  useEffect(() => { if (!focused) setText(shown(value)); }, [value, focused]);
  // "12." or "12," is a mark still being typed: neither sent nor flagged until finished or left.
  const unfinished = (raw: string) => /^\d+[.,]$/.test(raw.trim());
  const read = (raw: string) => (raw.trim() === '' ? null : Number(raw.trim().replace(',', '.').replace(/\.$/, '')));
  const inRange = (mark: number | null) => mark === null || (Number.isFinite(mark) && mark >= 0 && (total == null || mark <= Number(total)));
  const invalid = !unfinished(text) && !inRange(read(text));
  // The border takes the remark's colour, from green for excellent to red for insufficient.
  const remark = invalid ? null : gradeRemark({ marksObtained: read(text), totalMarks: total, status: 'graded' });

  // A keystroke re-renders this field only. The mark reaches the roster, which
  // re-renders every row and writes the draft to the tab's storage, once typing
  // pauses or the field is left; the roster's autosave then waits its own pause.
  const pending = useRef<{ mark: number | null } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const send = useRef(onChange);
  useEffect(() => { send.current = onChange; });
  const current = value === null || value === undefined || value === '' ? null : Number(value);
  const flush = () => {
    clearTimeout(timer.current);
    const next = pending.current;
    pending.current = null;
    if (next && next.mark !== current) send.current(next.mark);
  };
  // Leaving the page or the roster mid-pause still keeps what was typed.
  useEffect(() => () => {
    clearTimeout(timer.current);
    if (pending.current) send.current(pending.current.mark);
  }, []);

  const update = (next: string) => {
    setText(next);
    clearTimeout(timer.current);
    if (unfinished(next) || !inRange(read(next))) { pending.current = null; return; }
    pending.current = { mark: read(next) };
    timer.current = setTimeout(flush, SEND_AFTER_MS);
  };
  const leave = () => {
    setFocused(false);
    if (!inRange(read(text))) { pending.current = null; clearTimeout(timer.current); setText(shown(value)); return; }
    if (unfinished(text)) pending.current = { mark: read(text) };
    flush();
  };
  const move = (event: KeyboardEvent<HTMLInputElement>) => {
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' || event.key === 'Enter' ? 1 : 0;
    if (!step) return;
    event.preventDefault();
    const fields = [...document.querySelectorAll<HTMLInputElement>('input[data-grade-mark]:not(:disabled)')];
    fields[fields.indexOf(event.currentTarget) + step]?.focus();
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text" inputMode="decimal" autoComplete="off" data-grade-mark
        className={cn(
          'h-9 w-20 rounded-md border border-input bg-background text-center text-sm font-medium tabular-nums text-foreground outline-none transition focus:ring-2 focus:ring-primary/15 disabled:opacity-70',
          remark ? GRADE_REMARK_FIELD_STYLES[remark] : 'focus:border-primary',
          'aria-invalid:border-destructive aria-invalid:bg-destructive/5',
        )}
        value={text} disabled={disabled} aria-label={label} aria-invalid={invalid}
        title={invalid ? t('grades.validation.marksMax', { max: Number(total) }) : undefined}
        onFocus={event => { setFocused(true); event.currentTarget.select(); }}
        onBlur={leave}
        onChange={event => update(event.target.value)}
        onKeyDown={move}
      />
      {total != null && <span className="text-xs text-muted-foreground">/ {Number(total)}</span>}
    </div>
  );
}
