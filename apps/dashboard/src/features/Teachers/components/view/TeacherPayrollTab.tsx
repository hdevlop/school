"use client";

import React, { useMemo } from 'react';
import { Banknote, CalendarDays, FileText, ReceiptText, SearchX } from 'lucide-react';
import { NBadge, NCard, NEmptyState, NErrorState, NForbiddenState, NStatCard, NTable } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { getPayrollByStaffApi } from '@/services/payrollApi';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';

interface TeacherPayrollTabProps {
  teacher: any;
  // The school's business date, `YYYY-MM-DD`; its month is the current period.
  today: string | undefined;
}

const SLIP_STATUS_TEXT: Record<string, string> = {
  paid: 'text-success',
  pending: 'text-warning',
  cancelled: 'text-muted-foreground',
};

const formatPeriod = (period: string, locale: string, monthStyle: 'long' | 'short' = 'long') => {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  return new Intl.DateTimeFormat(locale, { month: monthStyle, year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
};

const TeacherPayrollTab: React.FC<TeacherPayrollTabProps> = ({ teacher, today }) => {
  const { t } = useTranslation();
  const { locale, majorMoney } = useSchoolFormat();
  const staffId: string | undefined = teacher?.staffId;
  const mode = teacher?.compensationMode === 'hourly' ? 'hourly' : 'monthly';
  const modeLabel = t(`staff.compensationModes.${mode}`);

  const { data: payslips, isLoading, error } = useYearScopedList({
    resource: 'payroll',
    parts: ['staff', staffId],
    fetch: () => getPayrollByStaffApi(staffId as string),
    enabled: !!staffId,
  });

  const currentPeriod = today?.slice(0, 7);
  const currentSlip = payslips.find((slip: any) => slip.period === currentPeriod);

  const columns = useMemo(() => [
    {
      accessorKey: 'period',
      header: t('teachers.profile.table.period'),
      enableSorting: true,
      cell: ({ getValue }) => <span className="font-medium text-foreground">{formatPeriod(getValue() as string, locale, 'short')}</span>,
    },
    {
      id: 'type',
      header: t('teachers.profile.table.type'),
      meta: { hiddenBelow: 'md' },
      cell: () => modeLabel,
    },
    {
      accessorKey: 'baseSalary',
      header: t('teachers.profile.table.base'),
      meta: { hiddenBelow: 'md' },
      cell: ({ getValue }) => majorMoney(Number(getValue() ?? 0)),
    },
    {
      accessorKey: 'netAmount',
      header: t('teachers.profile.table.amount'),
      enableSorting: true,
      cell: ({ getValue }) => <span className="font-semibold text-foreground">{majorMoney(Number(getValue() ?? 0))}</span>,
    },
    {
      accessorKey: 'status',
      header: t('teachers.profile.table.status'),
      enableSorting: true,
      cell: ({ getValue }) => <NBadge status={getValue() as string} />,
    },
  ], [t, locale, majorMoney, modeLabel]);

  // One payslip per line at phone width. The contract type is the stat card
  // above, and the base only says something when it differs from what was paid.
  const renderSlipCard = ({ data: slip }: { data: any }) => {
    const net = Number(slip.netAmount ?? 0);
    const base = Number(slip.baseSalary ?? 0);
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{formatPeriod(slip.period, locale, 'short')}</div>
          {base !== net && (
            <div className="truncate text-xs text-muted-foreground">
              {t('teachers.profile.table.base')} {majorMoney(base)}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-semibold tabular-nums text-foreground">{majorMoney(net)}</span>
          <NBadge status={slip.status} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-full flex-col gap-3 pb-20 lg:pb-1">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <NStatCard icon={FileText} label={t('teachers.profile.contractType')} value={modeLabel} />
        <NStatCard
          icon={Banknote}
          label={mode === 'hourly' ? t('dashboard.teacher.payroll.hourlyRate') : t('teachers.profile.monthlySalary')}
          value={majorMoney(Number((mode === 'hourly' ? teacher?.hourlyRate : teacher?.salary) ?? 0))}
        />
        <NStatCard
          className="col-span-2 md:col-span-1"
          icon={CalendarDays}
          loading={isLoading}
          label={currentPeriod ? formatPeriod(currentPeriod, locale) : t('teachers.profile.currentMonth')}
          value={currentSlip
            ? t(currentSlip.status === 'cancelled' ? 'status.cancelled' : `payroll.status.${currentSlip.status}`)
            : t('payroll.status.notSet')}
          classNames={{ value: SLIP_STATUS_TEXT[currentSlip?.status] }}
        />
      </div>

      <NCard title={t('dashboard.teacher.payroll.history')} icon={ReceiptText} className="lg:flex-1">
        <NTable
          data={payslips}
          columns={columns}
          renderCard={renderSlipCard}
          defaultMode="table"
          // A list inside a panel: the chat-button clearance that full-page card
          // grids carry belongs below the tab, not inside this card.
          classNames={{ cards: 'grid grid-cols-1 gap-2 pb-0!' }}
          loading={isLoading}
          error={hasFailedToLoad(error, payslips) ? error : null}
          renderError={(currentError) => (
            isAuthorizationError(currentError)
              ? <NForbiddenState surface="panel" />
              : <NErrorState surface="panel" />
          )}
          dynamicHeight={false}
          showPagination={false}
          showCheckbox={false}
          showAddButton={false}
          showViewToggle={false}
          showColumnVisibility={false}
          renderEmpty={() => (
            <NEmptyState surface="panel" icon={ReceiptText} title={t('teachers.profile.noPayments')} />
          )}
          renderFilteredEmpty={() => (
            <NEmptyState
              surface="panel"
              icon={SearchX}
              title={t('emptyStates.filtered.title')}
              description={t('emptyStates.filtered.description')}
            />
          )}
        />
      </NCard>
    </div>
  );
};

export default TeacherPayrollTab;
