import { useMemo } from 'react';
import { NBadge, NAvatar } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import {
  recognitionClasses,
  rewardClasses,
  tagClass,
} from '../behaviorRewardConstants';

export const useBehaviorRewardsTableColumns = () => {
  const { t } = useTranslation();
  const { displayDateTime } = useSchoolFormat();

  return useMemo(() => [
    {
      accessorKey: 'searchText',
      header: t('behaviorRewards.table.student'),
      enableSorting: false,
      cell: ({ row }) => {
        const student = row.original.student;
        return (
          <NAvatar
            src={student?.image}
            title={student?.name || '—'}
            subtitle={student?.studentCode || '—'}
            size="sm"
            version={row.original.updatedAt}
          />
        );
      },
    },
    {
      accessorKey: 'classSection',
      header: t('behaviorRewards.table.classSection'),
      cell: ({ row }) => (
        <div className="text-sm font-medium">
          {row.original.class?.name || '—'}
          <span className="mx-1.5 text-muted-foreground">/</span>
          {row.original.section?.name || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: t('behaviorRewards.table.positiveBehavior'),
      cell: ({ row }) => (
        <div className="max-w-72 space-y-1.5">
          <NBadge className="inline-flex rounded-md bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {t(`behaviorRewards.categories.${row.original.category}`)}
          </NBadge>
          <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{row.original.description}</p>
        </div>
      ),
    },
    {
      accessorKey: 'recognitionLevel',
      header: t('behaviorRewards.table.recognition'),
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return <NBadge className={tagClass(recognitionClasses, value)}>{t(`behaviorRewards.recognitionLevels.${value}`)}</NBadge>;
      },
    },
    {
      accessorKey: 'rewardType',
      header: t('behaviorRewards.table.reward'),
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return <NBadge className={tagClass(rewardClasses, value)}>{t(`behaviorRewards.rewardTypes.${value}`)}</NBadge>;
      },
    },
    {
      accessorKey: 'points',
      header: t('behaviorRewards.table.points'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const points = Number(getValue() || 0);
        return points > 0 ? (
          <NBadge className="inline-flex min-w-8 justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
            +{points}
          </NBadge>
        ) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'behaviorAt',
      header: t('behaviorRewards.table.behaviorDate'),
      enableSorting: true,
      cell: ({ getValue }) => <span className="whitespace-nowrap text-sm">{displayDateTime(getValue() as string)}</span>,
    },
    {
      accessorKey: 'awardedByUser',
      header: t('behaviorRewards.table.awardedBy'),
      cell: ({ row }) => <span className="block max-w-44 truncate text-sm font-medium">{row.original.awardedByUser?.name || '—'}</span>,
    },
  ], [displayDateTime, t]);
};
