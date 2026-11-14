import { useMemo } from 'react';
import { Check, Paperclip } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import type { HomeworkRow } from '@sms/contracts';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { homeworkPlacementLabel } from '../components/HomeworkCard';

type Cell = { row: { original: HomeworkRow } };
const none = <span className="text-gray-400">—</span>;

/**
 * `audience` picks the last column: staff see how many families have seen the
 * homework, a parent sees whether they have, and a pupil sees neither.
 */
export const useHomeworkTableColumns = (audience: 'staff' | 'parent' | 'student') => {
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
  ], [t, displayDateOnly, audience]);
};
