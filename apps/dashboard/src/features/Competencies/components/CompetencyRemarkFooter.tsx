'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { MessageSquareText } from 'lucide-react';
import { COMPETENCY_LIMITS, type CompetencyRemark } from '@sms/contracts';
import { NButton, Textarea } from 'najm-kit';
import { useCompetencyText } from './CompetencyText';

/** How long the teacher pauses before what they typed is saved. */
const SAVE_AFTER_MS = 800;

/**
 * The foot of the pupil sheet: the teacher's remark for the parents this
 * month. The teacher types it and it saves by itself, like a level; a family
 * reads it, and sees nothing when there is none. Mount it with a key per
 * pupil and month, so a draft never follows the teacher to another pupil.
 */
export function CompetencyRemarkFooter({ remark, onSave }: {
  remark: CompetencyRemark | null | undefined;
  /** Given to whoever may write it; without it the remark is read-only. */
  onSave?: (body: string) => Promise<unknown>;
}) {
  const saved = remark?.body ?? '';
  if (onSave) return <RemarkEditor saved={saved} onSave={onSave} />;
  if (!saved) return null;
  return <RemarkCard><p dir="auto" className="whitespace-pre-line text-sm leading-relaxed">{saved}</p></RemarkCard>;
}

function RemarkCard({ children }: { children: ReactNode }) {
  const { t } = useCompetencyText();
  return (
    <section aria-label={t('competencies.remark.title')} className="flex flex-col gap-2 rounded-xl border bg-card p-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <MessageSquareText aria-hidden="true" className="size-4 text-muted-foreground" />
        {t('competencies.remark.title')}
      </h3>
      {children}
    </section>
  );
}

type Status = 'idle' | 'saving' | 'saved' | 'failed';

function RemarkEditor({ saved, onSave }: { saved: string; onSave: (body: string) => Promise<unknown> }) {
  const { t, dir } = useCompetencyText();
  const [draft, setDraft] = useState(saved);
  const [status, setStatus] = useState<Status>('idle');
  const lastSaved = useRef(saved);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const save = useRef(onSave);
  useEffect(() => { save.current = onSave; }, [onSave]);

  /** Saves what is waiting, if it differs from what was last saved. */
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const body = pending.current;
    pending.current = null;
    if (body === null || body === lastSaved.current) return;
    setStatus('saving');
    try {
      await save.current(body);
      lastSaved.current = body;
      setStatus(pending.current === null ? 'saved' : 'saving');
    } catch {
      // The hook said why; the text stays here, and Retry or the next keystroke sends it again.
      pending.current ??= body;
      setStatus('failed');
    }
  }, []);

  // Leaving the sheet within the pause still saves what was typed.
  useEffect(() => () => {
    clearTimeout(timer.current);
    const body = pending.current;
    if (body !== null && body !== lastSaved.current) void save.current(body).catch(() => {});
  }, []);

  const change = (value: string) => {
    setDraft(value);
    pending.current = value.trim();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, SAVE_AFTER_MS);
  };

  return (
    <RemarkCard>
      {/* An Arabic list's remark is written right to left from the first letter; otherwise the text decides. */}
      <Textarea value={draft} dir={dir === 'rtl' ? 'rtl' : 'auto'} rows={3} maxLength={COMPETENCY_LIMITS.remark}
        placeholder={t('competencies.remark.placeholder')} aria-label={t('competencies.remark.title')}
        onChange={(event) => change(event.target.value)} onBlur={() => { void flush(); }}
        className="min-h-20 resize-y text-sm leading-relaxed" />
      <div className="flex min-h-8 items-center justify-between gap-2 text-xs">
        <span aria-live="polite" className={status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}>
          {status === 'saving' ? t('competencies.remark.saving')
            : status === 'saved' ? t('competencies.remark.saved')
              : status === 'failed' ? t('competencies.remark.failed') : null}
        </span>
        {status === 'failed' ? (
          <NButton type="button" size="sm" variant="outline" onClick={() => { pending.current ??= draft.trim(); void flush(); }}>
            {t('competencies.save.retry')}
          </NButton>
        ) : (
          <span className="tabular-nums text-muted-foreground">{draft.length}/{COMPETENCY_LIMITS.remark}</span>
        )}
      </div>
    </RemarkCard>
  );
}
