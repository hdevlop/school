'use client';

import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Input, NAvatar, NBadge, NButton, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

const percentOf = (obtained, total) => {
  if (obtained == null || obtained === '' || !total) return null;
  const value = Number(obtained);
  return Number.isNaN(value) ? null : Math.round((value / Number(total)) * 100);
};

interface GradeRosterCardProps {
  data: any;
  canEdit: (row: any) => boolean;
  onEdit: (row: any, columnId: string, value: any) => void;
  onToggleStatus: (row: any) => void;
}

/**
 * One student's grade on a phone: the same edits as the table's cells, in one
 * compact row so a section fits on a screen or two. Feedback stays folded
 * behind its button until it is opened or already holds text.
 */
export default function GradeRosterCard({ data: row, canEdit, onEdit, onToggleStatus }: GradeRosterCardProps) {
  const { t } = useTranslation();
  const editable = canEdit(row);
  const [marks, setMarks] = useState(row.marksObtained ?? '');
  const [feedback, setFeedback] = useState(row.feedback ?? '');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  useEffect(() => setMarks(row.marksObtained ?? ''), [row.marksObtained]);
  useEffect(() => setFeedback(row.feedback ?? ''), [row.feedback]);

  const total = row.totalMarks;
  const invalid = marks !== '' && (Number(marks) < 0 || (total != null && Number(marks) > Number(total)));
  const percent = percentOf(marks, total);
  const percentColor = percent == null ? 'text-muted-foreground' : percent >= 75 ? 'text-emerald-600' : percent >= 50 ? 'text-amber-600' : 'text-rose-600';
  const status = row.status || 'pending';
  const statusToggles = editable && (status === 'pending' || status === 'missed');
  const hasMarks = marks !== '';
  // Before an assessment or exam is chosen there is nothing to enter, so the
  // card is just the roster line instead of a row of dead inputs.
  const showMarks = editable || hasMarks;
  const hasFeedback = !!(row.feedback ?? '').trim();
  const showFeedback = feedbackOpen || hasFeedback;

  const commitMarks = () => {
    if (invalid) return;
    const value = marks === '' ? null : Number(marks);
    if (value !== (row.marksObtained ?? null)) onEdit(row, 'marksObtained', value);
  };

  const statusBadge = statusToggles ? (
    <NButton
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 shrink-0 rounded-full px-0 hover:bg-transparent"
      title={status === 'pending' ? t('grades.status.missed') : t('grades.status.pending')}
      onClick={(event) => { event.stopPropagation(); onToggleStatus(row); }}
    >
      <NBadge status={status} />
    </NButton>
  ) : <NBadge status={status} />;

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <NAvatar src={row.studentImage} fallback={row.studentName} size="md" version={row.studentUpdatedAt} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{row.studentName}</div>
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            <span className="truncate text-xs text-muted-foreground">{row.studentCode}</span>
            {statusBadge}
          </div>
        </div>
        {showMarks ? (
          <div className="flex shrink-0 flex-col items-end gap-1" onClick={(event) => event.stopPropagation()}>
            <label className="flex items-center gap-1 text-xs">
              <span className="sr-only">{t('grades.table.marksObtained')}</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={total ?? undefined}
                step={0.5}
                value={marks}
                disabled={!editable}
                aria-invalid={invalid}
                onChange={(event) => setMarks(event.target.value)}
                onBlur={commitMarks}
                className={cn('h-9 w-16 px-1 text-center text-base font-semibold', invalid && 'border-destructive')}
              />
              {total != null ? <span className="text-muted-foreground">/{total}</span> : null}
            </label>
            <div className="flex items-center gap-1">
              <span className={cn('text-xs font-semibold tabular-nums', percentColor)}>{percent == null ? '—' : `${percent}%`}</span>
              {editable && !hasFeedback ? (
                <NButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t('grades.table.feedback')}
                  aria-expanded={feedbackOpen}
                  title={t('grades.table.feedback')}
                  className={cn('h-6 w-6 p-0', feedbackOpen ? 'text-primary' : 'text-muted-foreground')}
                  onClick={() => setFeedbackOpen((open) => !open)}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </NButton>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {showFeedback ? (
        <Input
          value={feedback}
          disabled={!editable}
          autoFocus={feedbackOpen && !hasFeedback}
          placeholder={t('grades.table.feedback')}
          aria-label={t('grades.table.feedback')}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => setFeedback(event.target.value)}
          onBlur={() => { if (feedback !== (row.feedback ?? '')) onEdit(row, 'feedback', feedback); }}
          className="h-9 text-sm"
        />
      ) : null}
    </div>
  );
}
