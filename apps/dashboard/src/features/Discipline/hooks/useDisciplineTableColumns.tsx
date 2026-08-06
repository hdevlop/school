import { useMemo } from 'react';
import { NAvatar, NBadge } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
import {
  ACTION_COLORS,
  SEVERITY_COLORS,
  STATUS_COLORS,
  formatDisciplineDate,
  severityClassName,
  type DisciplineIncident,
} from '../disciplineConstants';

export const useDisciplineTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      id: 'studentSearch',
      accessorFn: (row: DisciplineIncident) => `${row.student?.name || ''} ${row.student?.studentCode || ''} ${row.description || ''}`,
      header: t('discipline.table.student'),
      cell: ({ row }) => (
        <NAvatar
          src={row.original.student?.image}
          title={row.original.student?.name || '—'}
          subtitle={row.original.student?.studentCode}
          size="sm"
        />
      ),
      enableSorting: true,
    },
    {
      id: 'classSection',
      accessorFn: (row: DisciplineIncident) => `${row.class?.name || ''} ${row.section?.name || ''}`,
      header: t('discipline.table.classSection'),
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">{row.original.class?.name || '—'}</div>
          <div className="text-xs text-muted-foreground">{row.original.section?.name || '—'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: t('discipline.table.violation'),
      cell: ({ row }) => (
        <div className="max-w-64">
          <div className="text-sm font-medium">{t(`discipline.categories.${row.original.category}`)}</div>
          <div className="truncate text-xs text-muted-foreground" title={row.original.description}>
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'severity',
      header: t('discipline.table.severity'),
      cell: ({ getValue }) => {
        const severity = String(getValue());
        return <NBadge color={SEVERITY_COLORS[severity]} className={severityClassName(severity)} label={t(`discipline.severity.${severity}`)} look="soft" />;
      },
    },
    {
      accessorKey: 'status',
      header: t('discipline.table.status'),
      cell: ({ getValue }) => {
        const status = String(getValue());
        return <NBadge color={STATUS_COLORS[status]} label={t(`discipline.status.${status}`)} look="soft" />;
      },
    },
    {
      accessorKey: 'incidentAt',
      header: t('discipline.table.incidentAt'),
      cell: ({ getValue }) => <span className="whitespace-nowrap text-sm">{formatDisciplineDate(String(getValue()))}</span>,
      enableSorting: true,
    },
    {
      accessorKey: 'actionType',
      header: t('discipline.table.action'),
      cell: ({ getValue }) => {
        const action = getValue() as string | null;
        return action
          ? <NBadge color={ACTION_COLORS[action]} label={t(`discipline.actions.${action}`)} look="soft" />
          : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'reporter',
      header: t('discipline.table.reportedBy'),
      cell: ({ row }) => (
        <div className="max-w-44 truncate text-sm">
          {row.original.reporter?.name || row.original.reporter?.email || '—'}
        </div>
      ),
    },
  ], [t]);
};
