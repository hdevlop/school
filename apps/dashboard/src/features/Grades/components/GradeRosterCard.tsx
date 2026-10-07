'use client';

import { useEffect, useState } from 'react';
import { Input, NAvatar, NBadge, NButton } from 'najm-kit';
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

/** One student's grade on a phone: the same edits as the table's cells. */
export default function GradeRosterCard({ data: row, canEdit, onEdit, onToggleStatus }: GradeRosterCardProps) {
  const { t } = useTranslation();
  const editable = canEdit(row);
  const [marks, setMarks] = useState(row.marksObtained ?? '');
  const [feedback, setFeedback] = useState(row.feedback ?? '');
  useEffect(() => setMarks(row.marksObtained ?? ''), [row.marksObtained]);
  useEffect(() => setFeedback(row.feedback ?? ''), [row.feedback]);

  const total = row.totalMarks;
  const invalid = marks !== '' && (Number(marks) < 0 || (total != null && Number(marks) > Number(total)));
  const percent = percentOf(marks, total);
  const percentColor = percent == null ? 'text-muted-foreground' : percent >= 75 ? 'text-emerald-600' : percent >= 50 ? 'text-amber-600' : 'text-rose-600';
  const status = row.status || 'pending';
  const statusToggles = editable && (status === 'pending' || status === 'missed');

  const commitMarks = () => {
    if (invalid) return;
    const value = marks === '' ? null : Number(marks);
    if (value !== (row.marksObtained ?? null)) onEdit(row, 'marksObtained', value);
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-3">
        <NAvatar src={row.studentImage} title={row.studentName} subtitle={row.studentCode} size="sm" version={row.studentUpdatedAt} />
        {statusToggles ? (
          <NButton
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 rounded-full px-1 hover:bg-transparent"
            title={status === 'pending' ? t('grades.status.missed') : t('grades.status.pending')}
            onClick={(event) => { event.stopPropagation(); onToggleStatus(row); }}
          >
            <NBadge status={status} />
          </NButton>
        ) : <NBadge status={status} />}
      </div>
      <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
        <label className="flex items-center gap-1.5 text-sm">
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
            className={`h-9 w-20 text-center ${invalid ? 'border-destructive' : ''}`}
          />
          {total != null ? <span className="text-muted-foreground">/ {total}</span> : null}
        </label>
        <span className={`ms-auto text-sm font-semibold ${percentColor}`}>{percent == null ? '—' : `${percent}%`}</span>
      </div>
      <Input
        value={feedback}
        disabled={!editable}
        placeholder={t('grades.table.feedback')}
        aria-label={t('grades.table.feedback')}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => setFeedback(event.target.value)}
        onBlur={() => { if (feedback !== (row.feedback ?? '')) onEdit(row, 'feedback', feedback); }}
        className="h-9"
      />
    </div>
  );
}
