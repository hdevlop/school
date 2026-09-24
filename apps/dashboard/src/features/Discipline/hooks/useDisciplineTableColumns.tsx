import { useMemo } from 'react';
import { NAvatar, NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import {
  ACTION_COLORS,
  SEVERITY_COLORS,
  STATUS_COLORS,
  formatDisciplineDate,
  severityClassName,
  type DisciplineIncident,
} from '../disciplineConstants';

export const useDisciplineTableColumns = () => {
  const { t, language } = useTranslation();

  return useMemo(() => [
    {
      id: 'studentSearch',
      accessorFn: (row: DisciplineIncident) => row.student?.studentCode || '',
      header: t('students.table.studentCode'),
      cell: ({ getValue }) => <span className="text-sm font-medium">{getValue() || '—'}</span>,
      enableSorting: true,
      filterFn: (row: { original: DisciplineIncident }, _columnId: string, value: unknown) => {
        const search = String(value ?? '').toLowerCase().trim();
        if (!search) return true;
        const incident = row.original;
        return [incident.student?.name, incident.student?.studentCode, incident.description]
          .some((field) => String(field ?? '').toLowerCase().includes(search));
      },
    },
    {
      id: 'studentName',
      accessorFn: (row: DisciplineIncident) => row.student?.name || '',
      header: t('students.table.name'),
      cell: ({ row }) => (
        <NAvatar
          src={row.original.student?.image}
          title={row.original.student?.name || '—'}
          size="sm"
        />
      ),
      enableSorting: true,
    },
    {
      id: 'classSection',
      accessorFn: (row: DisciplineIncident) => `${row.class?.name || ''} ${row.section?.name || ''}`,
      header: t('discipline.table.classSection'),
      cell: ({ row }) => {
        const classSection = [row.original.class?.name, row.original.section?.name].filter(Boolean).join(' / ');
        return <span className="whitespace-nowrap text-sm font-medium">{classSection || '—'}</span>;
      },
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
      cell: ({ getValue }) => {
        const value = String(getValue() || '');
        return <time dateTime={value} className="block min-w-max whitespace-nowrap text-sm">{formatDisciplineDate(value, language)}</time>;
      },
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
  ], [t, language]);
};
