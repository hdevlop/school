"use client"

import React, { useMemo } from 'react';
import { Eye, ShieldAlert } from 'lucide-react';
import { NAvatar, NBadge, NButton, NEmptyState, NErrorState, NForbiddenState, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useDialog } from '@/shared/useDialog';
import { useSchoolFormat, useSchoolToday } from '@/hooks/useSchoolFormat';
import { hasFailedToLoad, isAuthorizationError, isCountUnknown } from '@/services/apiError';
import { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import DisciplineForm from '@/features/Discipline/components/DisciplineForm';
import { useDiscipline } from '@/features/Discipline/hooks/useDiscipline';
import { missedByStudent, missedThisMonth, personInitials, type MissedByStudent } from '../config/homeworkCompletion';
import { useMissedHomework } from '../hooks/useHomework';
import MissedHomeworkCard from './MissedHomeworkCard';
import MissedHomeworkList from './MissedHomeworkList';

type Cell = { row: { original: MissedByStudent } };

/** A count that takes its color only when there is something to count. */
const Count = ({ value, tone }: { value: number; tone: string }) => (
  <div className={`text-sm tabular-nums ${value ? `font-semibold ${tone}` : 'text-muted-foreground'}`}>{value}</div>
);

/**
 * Conduite · Devoirs non faits: each pupil's missed homework (incomplete or
 * not done in a homework's follow-up) this year. A pupil who missed enough
 * this month is marked "to report", and a person may open a discipline
 * incident from here; the page never writes one itself.
 */
export default function HomeworkFollowUpTable() {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();
  const today = useSchoolToday();
  const { isFamily, can } = useViewerRole();
  const canReport = !isFamily && can('create:discipline');
  const scope = useClassSectionTableScope();
  const { openDialog, push } = useDialog();
  const { records, isLoading, error } = useMissedHomework();
  const { createIncident, isCreating } = useDiscipline({ enabled: false });

  const groups = useMemo(() => missedByStudent(records ?? [], today), [records, today]);
  const rows = useMemo(() => groups.filter(scope.matches), [groups, scope.matches]);

  const handleReport = (group: MissedByStudent, stacked = false) => {
    const missed = missedThisMonth(group, today);
    const list = missed.map((record) => `${record.subject?.name ? `${record.subject.name} · ` : ''}${record.title} (${displayDateOnly(record.date)})`).join(' ; ');
    const options = {
      title: t('discipline.dialogs.createTitle'),
      children: (
        <DisciplineForm draft={{
          studentId: group.student.id,
          category: 'other',
          severity: 'low',
          description: t('homeworkFollowUp.incidentDescription', { count: missed.length, list }),
        }} />
      ),
      primaryButton: {
        form: 'discipline-form', text: t('discipline.dialogs.createButton'), loading: isCreating,
        onClick: async (data: unknown) => { await (createIncident as (payload: unknown) => Promise<unknown>)(data); },
      },
      secondaryButton: { text: t('common.cancel') },
    };
    if (stacked) push(options);
    else openDialog(options);
  };

  const handleView = (group: MissedByStudent) => openDialog({
    title: t('homeworkFollowUp.viewTitle', { name: group.student.name }),
    width: '3xl',
    children: (
      <div className="flex flex-col gap-3">
        {group.toReport && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <span>{t('homeworkFollowUp.toReportHint', { count: group.thisMonth })}</span>
            {canReport && (
              <NButton type="button" size="sm" variant="outline" onClick={() => handleReport(group, true)}>
                <ShieldAlert className="h-4 w-4" aria-hidden />
                {t('homeworkFollowUp.reportAction')}
              </NButton>
            )}
          </div>
        )}
        <MissedHomeworkList records={group.records} />
      </div>
    ),
    showButtons: false,
  });

  const columns = useMemo(() => [
    {
      id: 'student',
      accessorFn: (row: MissedByStudent) => row.student.name,
      header: t('homeworkFollowUp.table.student'),
      enableSorting: true,
      cell: ({ row }: Cell) => (
        <div className="flex min-w-0 items-center gap-2">
          <NAvatar src={row.original.student.image} fallback={personInitials(row.original.student.name)} size="sm" />
          <span className="truncate text-sm font-medium" title={row.original.student.name}>{row.original.student.name}</span>
        </div>
      ),
      size: 280,
      minSize: 220,
    },
    {
      id: 'class',
      accessorFn: (row: MissedByStudent) => [row.class?.name, row.section?.name].filter(Boolean).join(' - '),
      header: t('homeworkFollowUp.table.class'),
      enableSorting: true,
      cell: ({ row }: Cell) => <div className="text-sm">{[row.original.class?.name, row.original.section?.name].filter(Boolean).join(' - ') || '—'}</div>,
    },
    {
      accessorKey: 'notDone',
      header: t('homeworkFollowUp.table.notDone'),
      enableSorting: true,
      cell: ({ row }: Cell) => <Count value={row.original.notDone} tone="text-red-600 dark:text-red-400" />,
      size: 100,
    },
    {
      accessorKey: 'incomplete',
      header: t('homeworkFollowUp.table.incomplete'),
      enableSorting: true,
      cell: ({ row }: Cell) => <Count value={row.original.incomplete} tone="text-amber-600 dark:text-amber-400" />,
      size: 100,
    },
    {
      accessorKey: 'thisMonth',
      header: t('homeworkFollowUp.table.thisMonth'),
      enableSorting: true,
      cell: ({ row }: Cell) => (
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums">{row.original.thisMonth}</span>
          {row.original.toReport && <NBadge color="destructive" look="soft" label={t('homeworkFollowUp.toReport')} />}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: 'lastDate',
      header: t('homeworkFollowUp.table.lastMissed'),
      enableSorting: true,
      cell: ({ row }: Cell) => <div className="text-sm">{displayDateOnly(row.original.lastDate)}</div>,
    },
    {
      id: 'subjects',
      accessorFn: (row: MissedByStudent) => row.subjects.join(', '),
      header: t('homeworkFollowUp.table.subjects'),
      enableSorting: false,
      cell: ({ row }: Cell) => <div className="text-sm text-muted-foreground">{row.original.subjects.join(', ') || '—'}</div>,
    },
  ], [t, displayDateOnly]);

  return (
    <div className='flex flex-col gap-2 w-full h-full min-h-0'>
      <NPageHeader
        icon={FEATURE_ICONS.homeworkFollowUp}
        title={t('homeworkFollowUp.title')}
        subtitle={isCountUnknown(error, records, isLoading) ? undefined : t('homeworkFollowUp.subtitle', { count: groups.length })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        exportTitle={t('homeworkFollowUp.title')}
        responsiveSkeleton
        className='min-h-0 flex-1'
        data={rows}
        getRowId={(row: MissedByStudent) => row.student.id}
        columns={columns}
        filters={scope.filters}
        onRowClick={handleView}
        menuButton
        menu={{
          row: (row: MissedByStudent) => [
            { label: t('common.view'), icon: Eye, onSelect: () => handleView(row) },
            ...(canReport ? [{ label: t('homeworkFollowUp.reportAction'), permission: 'create:discipline', icon: ShieldAlert, onSelect: () => handleReport(row) }] : []),
          ],
        }}
        renderCard={MissedHomeworkCard}
        loading={isLoading}
        error={hasFailedToLoad(error, records) ? error : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.homeworkFollowUp}
            title={scope.hasSelection ? t('emptyStates.filtered.title') : t('emptyStates.homeworkFollowUp.title')}
            description={scope.hasSelection ? t('emptyStates.filtered.description') : t('emptyStates.homeworkFollowUp.description')}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.homeworkFollowUp}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
          />
        )}
        defaultMode='table'
        dynamicHeight={true}
      />
    </div>
  );
}
