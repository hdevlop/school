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

  return (
    <div className="flex min-h-full flex-col gap-3 pb-1">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <NStatCard icon={FileText} label={t('teachers.profile.contractType')} value={modeLabel} />
        <NStatCard
          icon={Banknote}
          label={mode === 'hourly' ? t('dashboard.teacher.payroll.hourlyRate') : t('teachers.profile.monthlySalary')}
          value={majorMoney(Number((mode === 'hourly' ? teacher?.hourlyRate : teacher?.salary) ?? 0))}
        />
        <NStatCard
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
