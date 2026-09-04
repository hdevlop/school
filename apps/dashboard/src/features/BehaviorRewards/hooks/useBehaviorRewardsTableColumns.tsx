import { useMemo } from 'react';
import { NAvatar } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import {
  formatBehaviorDate,
  recognitionClasses,
  rewardClasses,
  tagClass,
} from '../behaviorRewardConstants';

export const useBehaviorRewardsTableColumns = () => {
  const { t, language } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: 'searchText',
      header: t('behaviorRewards.table.student'),
      enableSorting: false,
      cell: ({ row }) => {
        const student = row.original.student;
        return (
          <div className="flex min-w-52 items-center gap-3">
            <NAvatar src={student?.image} title={student?.name} size="sm" version={row.original.updatedAt} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{student?.name || '—'}</div>
              <div className="truncate text-xs text-muted-foreground">{student?.studentCode || '—'}</div>
            </div>
          </div>
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
          <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {t(`behaviorRewards.categories.${row.original.category}`)}
          </span>
          <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{row.original.description}</p>
        </div>
      ),
    },
    {
      accessorKey: 'recognitionLevel',
      header: t('behaviorRewards.table.recognition'),
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return <span className={tagClass(recognitionClasses, value)}>{t(`behaviorRewards.recognitionLevels.${value}`)}</span>;
      },
    },
    {
      accessorKey: 'rewardType',
      header: t('behaviorRewards.table.reward'),
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return <span className={tagClass(rewardClasses, value)}>{t(`behaviorRewards.rewardTypes.${value}`)}</span>;
      },
    },
    {
      accessorKey: 'points',
      header: t('behaviorRewards.table.points'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const points = Number(getValue() || 0);
        return points > 0 ? (
          <span className="inline-flex min-w-8 justify-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
            +{points}
          </span>
        ) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'behaviorAt',
      header: t('behaviorRewards.table.behaviorDate'),
      enableSorting: true,
      cell: ({ getValue }) => <span className="whitespace-nowrap text-sm">{formatBehaviorDate(getValue() as string, language)}</span>,
    },
    {
      accessorKey: 'awardedByUser',
      header: t('behaviorRewards.table.awardedBy'),
      cell: ({ row }) => (
        <div className="max-w-44 text-sm">
          <div className="truncate font-medium">{row.original.awardedByUser?.name || row.original.awardedByUser?.email || '—'}</div>
          {row.original.awardedByUser?.name && row.original.awardedByUser?.email ? (
            <div className="truncate text-xs text-muted-foreground">{row.original.awardedByUser.email}</div>
          ) : null}
        </div>
      ),
    },
  ], [language, t]);
};
