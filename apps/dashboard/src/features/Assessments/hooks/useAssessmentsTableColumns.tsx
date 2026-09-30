import { useMemo } from 'react';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { ASSESSMENT_STATUS_COLORS, ASSESSMENT_TYPE_COLORS } from '../assessmentBadgeColors';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

const formatDuration = (mins) => {
  if (!mins && mins !== 0) return '—';
  const m = Number(mins);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h}h ${rest}m` : `${h}h`;
  }
  return `${m}m`;
};

export const useAssessmentsTableColumns = () => {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();

  return useMemo(() => [
    {
      accessorKey: 'title',
      header: t('assessments.table.title'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-medium text-sm">{getValue()}</div>
      ),
    },
    {
      accessorKey: 'type',
      header: t('assessments.table.type'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const type = getValue() as string;
        return <NBadge color={ASSESSMENT_TYPE_COLORS[type]} label={t(`assessments.type.${type}`)} look="soft" />;
      },
    },
    {
      accessorKey: 'subject',
      header: t('assessments.table.subject'),
      enableSorting: false,
      cell: ({ row }) => {
        const name = row.original.subject?.name;
        if (!name) return <span className="text-gray-400">{t('common.notAssigned')}</span>;
        return <div className="font-medium text-sm">{name}</div>;
      },
    },
    {
      accessorKey: 'teacher',
      header: t('assessments.table.teacher'),
      enableSorting: false,
      cell: ({ row }) => {
        const name = row.original.teacher?.name;
        return name ? (
          <div className="text-sm">{name}</div>
        ) : (
          <span className="text-gray-400">{t('common.notAssigned')}</span>
        );
      },
    },
    {
      accessorKey: 'class',
      header: `${t('assessments.table.class')} - ${t('assessments.table.section')}`,
      enableSorting: false,
      cell: ({ row }) => {
        const className = row.original.class?.name;
        const sectionName = row.original.section?.name;
        const additionalSections = Math.max((row.original.sectionIds?.length || 0) - (sectionName ? 1 : 0), 0);
        if (!className) return <span className="text-gray-400">{t('common.notAssigned')}</span>;
        const sectionLabel = sectionName
          ? `${sectionName}${additionalSections ? ` +${additionalSections}` : ''}`
          : `${row.original.sectionIds?.length || 0} sections`;
        return <div className="font-medium text-sm">{`${className} - ${sectionLabel}`}</div>;
      },
    },
    {
      accessorKey: 'date',
      header: t('assessments.table.date'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <div className="text-sm">{displayDateOnly(value)}</div> : <span className="text-gray-400">—</span>;
      },
    },
    {
      accessorKey: 'duration',
      header: t('assessments.table.duration'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="text-sm">{formatDuration(getValue())}</div>
      ),
    },
    {
      accessorKey: 'totalMarks',
      header: t('assessments.table.totalMarks'),
      enableSorting: true,
      cell: ({ row }) => {
        const total = row.original.totalMarks;
        const passing = row.original.passingMarks;
        return (
          <div className="text-sm">
            <span className="font-medium">{total}</span>
            {passing != null && <span className="text-xs text-gray-500"> / {passing}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: t('assessments.table.status'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }) => {
        const status = getValue() as string;
        return <NBadge color={ASSESSMENT_STATUS_COLORS[status]} label={t(`assessments.status.${status}`)} look="soft" />;
      },
      size: 120,
    },
  ], [t, displayDateOnly]);
};
