import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { CategoryLabel, CategoryTile, PointsMark, RewardChip } from '../components/BehaviorRewardTags';
import { BehaviorRewardStudentIdentity } from '../components/BehaviorRewardStudentIdentity';

import { exportLabel } from '@/shared/tableExport';
export const useBehaviorRewardsTableColumns = () => {
  const { t } = useTranslation();
  const { displayDate, displayTime } = useSchoolFormat();

  return useMemo(() => [
    {
      accessorKey: 'student.studentCode',
      header: t('behaviorRewards.table.massarCode'),
      size: 128,
      cell: ({ getValue }) => {
        const code = (getValue() as string | null | undefined)?.trim();
        return <bdi dir="ltr" className="inline-block max-w-full truncate align-middle font-mono text-xs text-muted-foreground" title={code}>{code || '—'}</bdi>;
      },
    },
    {
      accessorKey: 'searchText',
      // The column filters on a search string but shows, and exports, the student.
      meta: { exportValue: (_search: unknown, row: { student?: { name?: string } }) => row.student?.name ?? '' },
      header: t('behaviorRewards.table.student'),
      enableSorting: false,
      cell: ({ row }) => <BehaviorRewardStudentIdentity student={row.original.student} updatedAt={row.original.updatedAt} />,
    },
    {
      accessorKey: 'classSection',
      size: 140,
      header: t('behaviorRewards.table.classSection'),
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
          <bdi>{row.original.class?.name || '—'}</bdi>
          <span className="text-muted-foreground">·</span>
          <bdi>{row.original.section?.name || '—'}</bdi>
        </span>
      ),
    },
    {
      accessorKey: 'category',
      meta: { exportValue: exportLabel(code => t(`behaviorRewards.categories.${code}`)) },
      header: t('behaviorRewards.table.positiveBehavior'),
      // The category's coloured tile, its name, then what the pupil did.
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <CategoryTile category={row.original.category} />
          <div className="min-w-0">
            <CategoryLabel category={row.original.category} className="max-w-full" />
            {row.original.description && (
              <p title={row.original.description} className="line-clamp-1 text-xs text-muted-foreground"><bdi>{row.original.description}</bdi></p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'rewardType',
      meta: { exportValue: exportLabel(code => t(`behaviorRewards.rewardTypes.${code}`)) },
      header: t('behaviorRewards.table.reward'),
      cell: ({ getValue }) => <RewardChip type={getValue() as string} />,
    },
    {
      accessorKey: 'points',
      size: 90,
      header: t('behaviorRewards.table.points'),
      enableSorting: true,
      cell: ({ getValue }) => <PointsMark points={getValue() as number} />,
    },
    {
      accessorKey: 'behaviorAt',
      size: 200,
      header: t('behaviorRewards.table.behaviorDate'),
      enableSorting: true,
      // The day, and the time under it in grey: one line ran the column wide.
      cell: ({ getValue }) => (
        <div className="grid whitespace-nowrap leading-tight">
          <span className="text-sm font-medium tabular-nums">{displayDate(getValue() as string)}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{displayTime(getValue() as string)}</span>
        </div>
      ),
    },
    {
      accessorKey: 'awardedByUser',
      header: t('behaviorRewards.table.awardedBy'),
      cell: ({ row }) => <span className="block max-w-44 truncate text-sm font-medium">{row.original.awardedByUser?.name || '—'}</span>,
    },
  ], [displayDate, displayTime, t]);
};
