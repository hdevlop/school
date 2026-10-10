'use client';

import { NAvatar, NBadge, NButton, cn } from 'najm-kit';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

export type OverdueRow = {
  studentId: string;
  studentName: string;
  studentCode: string;
  studentImage: string | null;
  classId: string | null;
  className: string;
  sectionId: string | null;
  sectionName: string | null;
  totalOverdue: number;
  daysOverdue: number;
  oldestDueDate: string | null;
};

export const urgencyRowColor = (days: number) => {
  if (days > 60) return 'border-l-red-500 bg-red-50/40';
  if (days > 30) return 'border-l-orange-400 bg-orange-50/40';
  return 'border-l-yellow-400 bg-yellow-50/40';
};

export const urgencyBadge = (days: number) => {
  if (days > 60) return 'bg-red-100 text-red-700';
  if (days > 30) return 'bg-orange-100 text-orange-700';
  return 'bg-yellow-100 text-yellow-700';
};

interface Props {
  data: OverdueRow;
  reminded: boolean;
  onRemind: (studentId: string, studentName: string) => void;
}

/** One overdue student at phone width, where the seven table columns did not fit. */
export default function ReminderCard({ data: row, reminded, onRemind }: Props) {
  const { t } = useTranslation();
  const { displayDateOnly, majorMoney } = useSchoolFormat();

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-l-4 bg-card p-3',
        reminded ? 'border-l-muted opacity-60' : urgencyRowColor(row.daysOverdue),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <NAvatar src={row.studentImage} fallback={row.studentName} size="sm" />
          <div className="min-w-0">
            <p className={cn('truncate font-medium', reminded && 'text-muted-foreground line-through')}>{row.studentName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.studentCode}</p>
          </div>
        </div>
        <NBadge
          className={cn(
            'inline-flex shrink-0 whitespace-nowrap rounded-full font-semibold',
            reminded ? 'bg-muted text-muted-foreground' : urgencyBadge(row.daysOverdue),
          )}
        >
          {t('reports.reminders.daysOverdue', {
            count: row.daysOverdue,
            plural: row.daysOverdue > 1 ? 's' : '',
          })}
        </NBadge>
      </div>
      <div className="flex items-end justify-between gap-2 text-sm">
        <div className="min-w-0">
          <p className="text-muted-foreground">
            {t('reports.reminders.oldestDueDate')}: {displayDateOnly(row.oldestDueDate)}
          </p>
          <p className={cn('font-bold tabular-nums', reminded ? 'text-muted-foreground' : 'text-red-600')}>
            {majorMoney(row.totalOverdue)}
          </p>
        </div>
        {reminded ? (
          <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            {t('reports.reminders.reminded')}
          </div>
        ) : (
          <NButton
            size="sm"
            variant="outline"
            onClick={(event) => {
              // The card itself selects the row; the button only sends the reminder.
              event.stopPropagation();
              onRemind(row.studentId, row.studentName);
            }}
            className="h-8 shrink-0 gap-1.5"
          >
            <Bell className="h-3.5 w-3.5" />
            {t('reports.reminders.remind')}
          </NButton>
        )}
      </div>
    </div>
  );
}
