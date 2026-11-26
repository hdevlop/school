import { useMemo } from 'react';
import { Check, Paperclip } from 'lucide-react';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { HomeworkCompletionStatus, HomeworkRow } from '@sms/contracts';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { COMPLETION_COLORS } from '../config/homeworkCompletion';
import { compareHomeworkGiven } from '../config/homeworkOrder';
import { homeworkPlacementLabel } from '../components/HomeworkCard';

type Cell = { row: { original: HomeworkRow } };
const none = <span className="text-gray-400">—</span>;

/**
 * The follow-up a family reads: a pupil their own, a parent each child's that
 * was recorded, named only when the homework was for several of them.
 */
export function familyCompletions(row: HomeworkRow): Array<{ key: string; name: string | null; status: HomeworkCompletionStatus; note: string | null }> {
  if (row.completion) return [{ key: 'self', name: null, status: row.completion.status, note: row.completion.note }];
  const children = row.children ?? [];
  return children.flatMap((child) => child.completion
    ? [{ key: child.id, name: children.length > 1 ? child.name : null, status: child.completion.status, note: child.completion.note }]
    : []);
}

/**
 * `audience` picks the last column: staff see how many families have seen the
 * homework, a parent sees whether they have, and a pupil sees neither.
 */
export const useHomeworkTableColumns = (audience: 'staff' | 'parent' | 'student', onFollowUp?: (row: HomeworkRow) => void) => {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();

  return useMemo(() => [
    {
      accessorKey: 'title',
      header: t('homework.table.title'),
      enableSorting: true,
      cell: ({ row }: Cell) => <div className="text-sm font-medium">{row.original.title}</div>,
    },
    {
      id: 'subject',
      accessorFn: (row: HomeworkRow) => row.subject?.name ?? '',
      header: t('homework.table.subject'),
      enableSorting: true,
      cell: ({ row }: Cell) => row.original.subject?.name
        ? (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{row.original.subject.name}</span>
            {row.original.subSubject && <span className="text-xs text-muted-foreground">{row.original.subSubject}</span>}
          </div>
        )
        : <span className="text-gray-400">{t('common.notAssigned')}</span>,
    },
    {
      id: 'teacher',
      accessorFn: (row: HomeworkRow) => row.teacher?.name ?? '',
      header: t('homework.table.teacher'),
      enableSorting: true,
      cell: ({ row }: Cell) => row.original.teacher?.name
        ? <div className="text-sm">{row.original.teacher.name}</div>
        : <span className="text-gray-400">{t('common.notAssigned')}</span>,
    },
    {
      id: 'class',
      accessorFn: (row: HomeworkRow) => homeworkPlacementLabel(row),
      header: `${t('homework.table.class')} - ${t('homework.table.section')}`,
      enableSorting: false,
      cell: ({ row }: Cell) => <div className="text-sm font-medium">{homeworkPlacementLabel(row.original) || none}</div>,
    },
    {
      accessorKey: 'date',
      header: t('homework.table.date'),
      enableSorting: true,
      sortingFn: (left: { original: HomeworkRow }, right: { original: HomeworkRow }) => compareHomeworkGiven(left.original, right.original),
      cell: ({ row }: Cell) => <div className="text-sm">{displayDateOnly(row.original.date)}</div>,
    },
    {
      accessorKey: 'dueOn',
      header: t('homework.table.dueOn'),
      enableSorting: true,
      cell: ({ row }: Cell) => row.original.dueOn ? <div className="text-sm">{displayDateOnly(row.original.dueOn)}</div> : none,
    },
    {
      id: 'attachments',
      accessorFn: (row: HomeworkRow) => row.attachments?.length ?? 0,
      header: t('homework.table.attachments'),
      enableSorting: true,
      cell: ({ row }: Cell) => row.original.attachments?.length
        ? <div className="flex items-center gap-1 text-sm"><Paperclip className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />{row.original.attachments.length}</div>
        : none,
      size: 90,
    },
    ...(audience === 'staff' ? [{
      id: 'seen',
      accessorFn: (row: HomeworkRow) => row.seenCount ?? 0,
      header: t('homework.table.seen'),
      enableSorting: true,
      cell: ({ row }: Cell) => row.original.studentCount == null ? none : (
        <div className="text-sm tabular-nums">
          {t('homework.card.seenCount', { seen: row.original.seenCount ?? 0, total: row.original.studentCount })}
        </div>
      ),
      size: 130,
    }] : []),
    ...(audience === 'staff' ? [{
      id: 'followUp',
      accessorFn: (row: HomeworkRow) => row.completionCounts
        ? (row.completionCounts.reviewed ? row.completionCounts.incomplete + row.completionCounts.notDone : -1)
        : -1,
      header: t('homework.table.followUp'),
      enableSorting: true,
      cell: ({ row }: Cell) => {
        const counts = row.original.completionCounts;
        const missed = counts ? counts.incomplete + counts.notDone : 0;
        const content = !counts?.reviewed
          ? <span className="text-sm text-muted-foreground underline decoration-dotted underline-offset-4">{t('homework.completion.notReviewed')}</span>
          : missed
            ? <NBadge color={counts.notDone ? 'destructive' : 'warning'} look="soft" label={t('homework.completion.missed', { count: missed })} />
            : <NBadge color="success" look="soft" label={t('homework.completion.allDone')} />;
        // A writer opens the follow-up from the cell itself, without the row menu.
        if (!onFollowUp) return content;
        return (
          <button
            type="button"
            title={t('homework.completion.menu')}
            className="rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(event) => { event.stopPropagation(); onFollowUp(row.original); }}
          >
            {content}
          </button>
        );
      },
      size: 130,
    }] : []),
    ...(audience !== 'staff' ? [{
      id: 'followUp',
      accessorFn: (row: HomeworkRow) => familyCompletions(row).map((entry) => entry.status).join(','),
      header: t('homework.table.followUp'),
      enableSorting: false,
      cell: ({ row }: Cell) => {
        const entries = familyCompletions(row.original);
        if (!entries.length) return <span className="text-sm text-muted-foreground">{t('homework.completion.notReviewed')}</span>;
        return (
          <div className="flex flex-col items-start gap-1">
            {entries.map((entry) => (
              <NBadge
                key={entry.key}
                color={COMPLETION_COLORS[entry.status]}
                look="soft"
                label={[entry.name, t(`homework.completion.status.${entry.status}`)].filter(Boolean).join(' · ')}
              />
            ))}
          </div>
        );
      },
      size: 150,
    }] : []),
    ...(audience === 'parent' ? [{
      id: 'seen',
      accessorFn: (row: HomeworkRow) => (row.children?.length && row.children.every((child) => child.seenAt) ? 1 : 0),
      header: t('homework.table.seen'),
      enableSorting: true,
      cell: ({ row }: Cell) => row.original.children?.length && row.original.children.every((child) => child.seenAt)
        ? <Check className="h-4 w-4 text-primary" aria-label={t('homework.success.acknowledged')} />
        : none,
      size: 110,
    }] : []),
  ], [t, displayDateOnly, audience, onFollowUp]);
};
