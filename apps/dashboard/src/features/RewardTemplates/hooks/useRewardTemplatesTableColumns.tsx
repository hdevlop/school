import { useMemo } from 'react';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { exportLabel, exportStatus } from '@/shared/tableExport';
import {
  CategoryLabel,
  CategoryTile,
  PointsMark,
  RewardChip,
} from '@/features/BehaviorRewards/components/BehaviorRewardTags';

export const useRewardTemplatesTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: 'searchText',
      // The column filters on a search string but shows, and exports, the title.
      meta: { exportValue: (_search: unknown, row: { title?: string }) => row.title ?? '' },
      header: t('rewardTemplates.table.title'),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="grid min-w-0 gap-0.5">
          <span className="truncate text-sm font-semibold">{row.original.title}</span>
          {row.original.description && (
            <span className="line-clamp-1 text-xs text-muted-foreground">{row.original.description}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      meta: { exportValue: exportLabel(code => t(`behaviorRewards.categories.${code}`)) },
      header: t('behaviorRewards.form.category'),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2">
          <CategoryTile category={row.original.category} />
          <CategoryLabel category={row.original.category} />
        </div>
      ),
    },
    {
      accessorKey: 'rewardType',
      meta: { exportValue: exportLabel(code => t(`behaviorRewards.rewardTypes.${code}`)) },
      header: t('behaviorRewards.table.reward'),
      enableSorting: true,
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
      accessorKey: 'status',
      size: 110,
      meta: { exportValue: exportStatus(t) },
      header: t('rewardTemplates.table.status'),
      enableSorting: true,
      cell: ({ getValue }) => <NBadge status={getValue() as string} />,
    },
  ], [t]);
};
