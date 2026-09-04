"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { Banknote, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock, HandCoins, ReceiptText, Timer, Undo2, UserRound, Wallet } from 'lucide-react';
import { Badge, NTable, NButton, NPageHeader, NPageHeaderActions, NStatCard, NSkeletonWidgets } from 'najm-kit';
import type { RowSelectionState } from '@tanstack/react-table';
import { useTranslation } from 'najm-i18n/react';
import { useStaff } from '@/features/Staff/hooks/useStaff';
import { usePayroll } from '@/features/Financial/Payroll/hooks/usePayroll';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

const money = (value?: string | number | null) => {
  const numeric = Number(value || 0);
  return `${numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })} DH`;
};

const calculateStaffPay = (member) => {
  if (member?.compensationMode === 'hourly') {
    return Number(member?.hourlyRate || 0) * Number(member?.workloadHours || 0);
  }
  return Number(member?.salary || 0);
};

const normalizeEmploymentType = (value?: string | null) => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('part') || normalized.includes('contract') || normalized.includes('temporary')) {
    return 'vacataire';
  }
  return 'permanent';
};

// Current period in 'YYYY-MM' (what the backend expects).
const currentPeriod = () => new Date().toISOString().slice(0, 7);

const formatPeriod = (period: string) => {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const PayrollTable = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<string>(currentPeriod());
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { staff, isStaffLoading } = useStaff();
  const {
    payslips,
    summary,
    isPayrollLoading,
    isError,
    error,
    payStaff,
    payStaffBulk,
    unpayStaff,
    isPaying,
  } = usePayroll({ period });

  const isLoading = isStaffLoading || isPayrollLoading;

  // Only active staff with a salary can be paid — mirror the backend's eligibility.
  const eligibleStaff = useMemo(
    () => (Array.isArray(staff) ? staff : []).filter(
      (member) => member?.status === 'active' && calculateStaffPay(member) > 0,
    ),
    [staff],
  );

  const payslipByStaff = useMemo(() => {
    const map = new Map<string, any>();
    (Array.isArray(payslips) ? payslips : []).forEach((slip) => {
      if (slip?.staffId) map.set(slip.staffId, slip);
    });
    return map;
  }, [payslips]);

  const tableRows = useMemo(() => {
    return eligibleStaff.map((member) => {
      const slip = payslipByStaff.get(member.id);
      return {
        id: slip?.id ?? `staff-${member.id}`,
        payslipId: slip?.id ?? null,
        staffId: member.id,
        name: slip?.staffName ?? member.name ?? '-',
        role: slip?.staffRole ?? member.role,
        contractType: normalizeEmploymentType(member?.employmentType),
        payrollPeriod: formatPeriod(period),
        paymentAmount: Number(slip?.netAmount ?? calculateStaffPay(member)),
        paymentStatus: slip ? slip.status : 'notRun',
        payslipNumber: slip?.payslipNumber ?? null,
      };
    });
  }, [eligibleStaff, payslipByStaff, period]);

  const totalPayroll = summary?.totalNet
    ?? tableRows.reduce((sum, row) => sum + row.paymentAmount, 0);
  const pendingCount = summary?.pendingCount
    ?? tableRows.filter((row) => row.paymentStatus === 'pending').length;
  const paidCount = summary?.paidCount
    ?? tableRows.filter((row) => row.paymentStatus === 'paid').length;

  // Unpaid (not-yet-paid) selected staff — these are the ones a bulk pay would act on.
  const selectedUnpaidStaffIds = useMemo(() => {
    return Object.keys(rowSelection)
      .map((rowId) => tableRows.find((item) => item.id === rowId))
      .filter((row): row is (typeof tableRows)[number] => Boolean(row && row.paymentStatus !== 'paid'))
      .map((row) => row.staffId);
  }, [rowSelection, tableRows]);

  // One click: create the payslip (if needed) and mark it paid. Salaries default to bank transfer.
  const handlePayOne = useCallback(async (staffId: string) => {
    await payStaff({ staffId, period, paymentMethod: 'bankTransfer' });
  }, [payStaff, period]);

  // Toggle off — undo a payment made by mistake (keeps the payslip history, back to pending).
  const handleUnpayOne = useCallback(async (staffId: string) => {
    await unpayStaff({ staffId, period });
  }, [unpayStaff, period]);

  const handlePaySelected = useCallback(async (staffIds: string[]) => {
    if (staffIds.length === 0) return;
    await payStaffBulk({ staffIds, period, paymentMethod: 'bankTransfer' });
    setRowSelection((current) => {
      const next = { ...current };
      tableRows.forEach((row) => {
        if (staffIds.includes(row.staffId)) delete next[row.id];
      });
      return next;
    });
  }, [payStaffBulk, period, tableRows]);

  const typeBadge = useCallback((type: string) => {
    const isVacataire = type === 'vacataire';
    const Icon = isVacataire ? Timer : BriefcaseBusiness;
    return (
      <Badge className={isVacataire ? 'gap-1 border-transparent bg-sky-600 text-white shadow-sm' : 'gap-1 border-transparent bg-emerald-600 text-white shadow-sm'}>
        <Icon className="h-3 w-3" />
        {isVacataire ? t('payroll.types.vacataire') : t('payroll.types.permanent')}
      </Badge>
    );
  }, [t]);

  const statusBadge = useCallback((status: string) => {
    if (status === 'paid') {
      return (
        <Badge className="gap-1 border-transparent bg-emerald-600 text-white shadow-sm">
          <CheckCircle2 className="h-3 w-3" />
          {t('payroll.status.paid')}
        </Badge>
      );
    }

    if (status === 'pending') {
      return (
        <Badge className="gap-1 border-transparent bg-amber-500 text-amber-950 shadow-sm">
          <Clock className="h-3 w-3" />
          {t('payroll.status.pending')}
        </Badge>
      );
    }

    return (
      <Badge className="border-transparent bg-slate-600 text-white shadow-sm">
        {t('payroll.status.notSet')}
      </Badge>
    );
  }, [t]);

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('payroll.table.staff'),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <UserRound className="h-4 w-4 text-primary" />
          {row.original.name || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'payrollPeriod',
      header: t('payroll.table.period'),
      enableSorting: true,
    },
    {
      accessorKey: 'contractType',
      header: t('payroll.table.type'),
      enableSorting: true,
      cell: ({ getValue }) => typeBadge(getValue() as string),
    },
    {
      accessorKey: 'paymentAmount',
      header: t('payroll.table.amount'),
      enableSorting: true,
      cell: ({ getValue }) => <span className="font-semibold text-slate-800">{money(getValue() as number)}</span>,
    },
    {
      accessorKey: 'paymentStatus',
      header: t('payroll.table.status'),
      enableSorting: true,
      cell: ({ getValue }) => statusBadge(getValue() as string),
    },
    {
      id: 'pay',
      header: t('payroll.table.action'),
      enableSorting: false,
      cell: ({ row }) => {
        const isPaid = row.original.paymentStatus === 'paid';
        return (
          <NButton
            size="sm"
            variant={isPaid ? 'outline' : 'default'}
            disabled={isPaying}
            onClick={() => (isPaid ? handleUnpayOne(row.original.staffId) : handlePayOne(row.original.staffId))}
            className="gap-1"
          >
            {isPaid ? <Undo2 className="h-4 w-4" /> : <HandCoins className="h-4 w-4" />}
            {isPaid ? t('payroll.actions.unpay') : t('payroll.actions.pay')}
          </NButton>
        );
      },
    },
  ], [t, handlePayOne, handleUnpayOne, statusBadge, typeBadge, isPaying]);

  // Last 12 months + next month, newest first — drives the period query (refetch on change).
  const periodOptions = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 13 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (i - 1), 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { value, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
    });
  }, []);

  const filters = useMemo(() => [
    {
      name: 'period',
      type: 'select',
      value: period,
      onChange: (value: string) => setPeriod(value || currentPeriod()),
      placeholder: t('payroll.stats.period'),
      className: 'w-full lg:w-44',
      options: periodOptions,
    },
    {
      name: 'name',
      type: 'text',
      placeholder: t('payroll.filters.searchByStaff'),
      className: 'w-full lg:w-64',
    },
    {
      name: 'contractType',
      type: 'select',
      placeholder: t('payroll.filters.filterByType'),
      className: 'w-full lg:w-48',
      options: [
        { value: 'permanent', label: t('payroll.types.permanent') },
        { value: 'vacataire', label: t('payroll.types.vacataire') },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      placeholder: t('payroll.filters.filterByStatus'),
      className: 'w-full lg:w-48',
      options: [
        { value: 'pending', label: t('payroll.status.pending') },
        { value: 'paid', label: t('payroll.status.paid') },
        { value: 'notRun', label: t('payroll.status.notSet') },
      ],
    },
  ], [t, period, periodOptions]);

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <NPageHeader
        icon={Wallet}
        title={t('navigation.payroll')}
        subtitle={`${t('payroll.subtitle.count', { count: tableRows.length })} · ${formatPeriod(period)}`}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      {isLoading ? (
        <NSkeletonWidgets />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <NStatCard
            icon={CalendarDays}
            label={t('payroll.stats.period')}
            value={formatPeriod(period)}
          />
          <NStatCard
            icon={Banknote}
            label={t('payroll.stats.payroll')}
            value={money(totalPayroll)}
          />
          <NStatCard
            icon={ReceiptText}
            label={t('payroll.stats.pending')}
            value={pendingCount}
          />
          <NStatCard
            icon={Clock}
            label={t('payroll.stats.hourlyMonthly')}
            value={`${paidCount} / ${tableRows.length}`}
          />
        </div>
      )}

      <NTable
        data={tableRows}
        columns={columns}
        getRowId={(row) => row.id}
        filters={filters}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        headerSlot={
          (() => {
            // No selection → pay everyone unpaid; with selection → pay just those.
            const allUnpaidIds = tableRows.filter((r) => r.paymentStatus !== 'paid').map((r) => r.staffId);
            const payTargets = selectedUnpaidStaffIds.length > 0 ? selectedUnpaidStaffIds : allUnpaidIds;
            return (
              <NButton
                disabled={payTargets.length === 0 || isPaying}
                onClick={() => handlePaySelected(payTargets)}
                className="gap-2"
              >
                <HandCoins className="h-4 w-4" />
                {t('payroll.actions.pay')} ({payTargets.length})
              </NButton>
            );
          })()
        }
        loading={isLoading}
        error={isError ? error : null}
        showAddButton={false}
        showViewToggle={false}
        defaultMode='table'
        showColumnVisibility={true}
        loadingText={t('payroll.loading')}
        noDataText={t('payroll.noData')}
      />
    </div>
  );
};

export default PayrollTable;
