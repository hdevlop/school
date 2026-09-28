import { useMemo } from 'react';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import {
  PRIORITY_COLORS,
  STATUS_COLORS,
  alertSubject,
  formatAlertDate,
  type AlertRecord,
} from '../alertConstants';

export const useAlertsTableColumns = () => {
  const { t, language } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: 'title',
      header: t('alerts.page.columns.title'),
      cell: ({ row }: { row: { original: AlertRecord } }) => (
        <div className="max-w-80 space-y-1">
          <p className="font-medium">{row.original.title}</p>
          <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{row.original.message}</p>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: t('alerts.page.columns.type'),
      cell: ({ row }: { row: { original: AlertRecord } }) => (
        <span className="text-sm">{t(`alerts.page.types.${row.original.type}`)}</span>
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
        <span className="whitespace-nowrap text-sm text-muted-foreground">{formatAlertDate(row.original.createdAt, language)}</span>
      ),
    },
  ], [language, t]);
};
