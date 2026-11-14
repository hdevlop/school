'use client';

import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Input, NAvatar, NButton, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { avatarVersion } from '@/lib/avatarVersion';
import { GradeMarkField } from './GradeMarkField';
import { GradeStatus } from './GradeStatus';

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
 * opened or already holds text. A long press or a double tap on the card opens
 * the student's menu (GradeStudentMenu): absent, clear the mark, the remark.
 * The absent tag, tapped, still undoes an absence.
 */
export default function GradeRosterCard({ data: row, canEdit, onEdit, onToggleStatus, allowFeedback = true }: GradeRosterCardProps) {
  const { t } = useTranslation();
  const editable = canEdit(row);
  const [feedback, setFeedback] = useState(row.feedback ?? '');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  useEffect(() => setFeedback(row.feedback ?? ''), [row.feedback]);

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
          {/* No Massar code on a phone: the two names say who it is.
              A mark says it is graded, and its field's colour how well; an absence takes the mark's place (right). */}
          {status !== 'pending' && status !== 'graded' && status !== 'missed' ? (
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              <GradeStatus status={status} editable={editable} onToggle={() => onToggleStatus(row)} />
            </div>
          ) : null}
          {/* The teacher's remark on a Massar grid, written from the student's menu. */}
          {row.remark ? (
            <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare aria-hidden="true" className="size-3 shrink-0" />
              <span dir="auto" className="truncate italic">{row.remark}</span>
            </div>
          ) : null}
        </div>
        {status === 'missed' ? (
          // Absent: there is no mark to type, so the tag stands where the mark would; tapped, it undoes the absence.
          <div className="flex shrink-0 items-center" onClick={(event) => event.stopPropagation()}>
            <GradeStatus status={status} editable={editable} onToggle={() => onToggleStatus(row)} />
          </div>
        ) : editable || row.marksObtained != null ? (
          <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
            <GradeMarkField
              value={row.marksObtained} total={row.totalMarks} disabled={!editable}
              label={`${row.studentName} · ${t('grades.table.marksObtained')}`}
              onChange={(value) => onEdit(row, 'marksObtained', value)}
            />
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
