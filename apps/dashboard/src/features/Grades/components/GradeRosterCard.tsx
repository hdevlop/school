'use client';

import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Input, NAvatar, NButton, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { avatarVersion } from '@/lib/avatarVersion';
import { GradeMarkField } from './GradeMarkField';
import { GradeStatus } from './GradeStatus';

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
  allowFeedback?: boolean;
}

/**
 * One student's grade on a phone: name and status on the left, the mark field
 * on the right, the same field as the table's (saved on its own, Enter moves
 * to the next student). Feedback stays folded behind its button until it is
 * opened or already holds text.
 */
export default function GradeRosterCard({ data: row, canEdit, onEdit, onToggleStatus, allowFeedback = true }: GradeRosterCardProps) {
  const { t } = useTranslation();
  const editable = canEdit(row);
  const [feedback, setFeedback] = useState(row.feedback ?? '');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  useEffect(() => setFeedback(row.feedback ?? ''), [row.feedback]);

  const percent = percentOf(row.marksObtained, row.totalMarks);
  const percentColor = percent == null ? '' : percent >= 75 ? 'text-emerald-600' : percent >= 50 ? 'text-amber-600' : 'text-rose-600';
  const status = row.status || 'pending';
  const hasFeedback = !!(row.feedback ?? '').trim();
  const showFeedback = allowFeedback && (feedbackOpen || hasFeedback);

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      <div className="flex items-center gap-2.5">
        <NAvatar src={row.studentImage} fallback={row.studentName} size="sm" version={avatarVersion(row.studentImage, row.studentUpdatedAt)} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{row.studentName}</div>
          {/* Both names: the Arabic one as Massar writes it, at a regular weight. */}
          {row.studentArabicName ? (
            <div className="truncate text-sm leading-6"><bdi lang="ar" dir="rtl">{row.studentArabicName}</bdi></div>
          ) : null}
          {/* No Massar code on a phone: the two names say who it is, and the line keeps only what the mark adds.
              A mark says it is graded, and its field's colour how well: only absence needs a tag. */}
          {(status !== 'pending' && status !== 'graded') || percent != null ? (
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              {status !== 'pending' && status !== 'graded' ? <GradeStatus status={status} editable={editable} onToggle={() => onToggleStatus(row)} /> : null}
              {percent != null ? <span className={cn('text-xs font-semibold tabular-nums', percentColor)}>{percent}%</span> : null}
            </div>
          ) : null}
        </div>
        {editable || row.marksObtained != null ? (
          <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
            <GradeMarkField
              value={row.marksObtained} total={row.totalMarks} disabled={!editable}
              label={`${row.studentName} · ${t('grades.table.marksObtained')}`}
              onChange={(value) => onEdit(row, 'marksObtained', value)}
            />
            {/* Always the same width, so every mark field lines up whether or not it can mark an absence. */}
            {editable ? (
              <span className="flex size-7 shrink-0 items-center justify-center">
                {status === 'pending' ? <GradeStatus status={status} editable onToggle={() => onToggleStatus(row)} /> : null}
              </span>
            ) : null}
            {allowFeedback && editable && !hasFeedback ? (
              <NButton
                type="button" variant="ghost" size="sm"
                aria-label={t('grades.table.feedback')} aria-expanded={feedbackOpen} title={t('grades.table.feedback')}
                className={cn('size-8 p-0', feedbackOpen ? 'text-primary' : 'text-muted-foreground')}
                onClick={() => setFeedbackOpen((open) => !open)}
              >
                <MessageSquare className="size-4" />
              </NButton>
            ) : null}
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
