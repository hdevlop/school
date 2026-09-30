import { useMemo } from 'react';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import {
  PRIORITY_COLORS,
  STATUS_COLORS,
  TYPE_COLORS,
  alertSubject,
  type AlertRecord,
} from '../alertConstants';

export const useAlertsTableColumns = () => {
  const { t } = useTranslation();
  const { displayDateTime } = useSchoolFormat();

  return useMemo(() => [
    {
      accessorKey: 'title',
      header: t('alerts.page.columns.title'),
      cell: ({ row }: { row: { original: AlertRecord } }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: t('alerts.page.columns.type'),
      cell: ({ row }: { row: { original: AlertRecord } }) => (
        <NBadge color={TYPE_COLORS[row.original.type]} label={t(`alerts.page.types.${row.original.type}`)} look="soft" size="sm" />
      ),
    },
    {
      id: 'about',
      header: t('alerts.page.about'),
      cell: ({ row }: { row: { original: AlertRecord } }) => (
        <span className="text-sm">{alertSubject(row.original) ?? t('alerts.page.schoolWide')}</span>
      ),
    },
    {
      accessorKey: 'priority',
      header: t('alerts.page.columns.priority'),
      cell: ({ row }: { row: { original: AlertRecord } }) => (
        <NBadge color={PRIORITY_COLORS[row.original.priority]} label={t(`alerts.page.priorities.${row.original.priority}`)} look="soft" size="sm" />
      ),
    },
    {
      accessorKey: 'status',
      header: t('alerts.page.columns.status'),
      cell: ({ row }: { row: { original: AlertRecord } }) => (
        <NBadge color={STATUS_COLORS[row.original.status]} label={t(`alerts.page.statuses.${row.original.status}`)} look="soft" size="sm" />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: t('alerts.page.columns.date'),
      enableSorting: true,
      cell: ({ row }: { row: { original: AlertRecord } }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">{displayDateTime(row.original.createdAt)}</span>
      ),
    },
  ], [displayDateTime, t]);
};
