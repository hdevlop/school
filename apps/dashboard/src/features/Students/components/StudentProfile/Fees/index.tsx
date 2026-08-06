'use client';

import Link from 'next/link';
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDollarSign, Clock, CreditCard, FileText } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { NCard, NStatCard, NTable } from 'najm-kit';
import { useFees } from '@/features/Financial/Fees/hooks/useFees';
import { useTranslation } from '@/hooks/useLanguage';

interface FeesTabProps {
  studentId?: string;
  onOpenFeeRecord?: (feeId?: string) => void;
}

const toNumber = (value: unknown) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const formatMoney = (value: unknown, language: string) => `${Math.round(toNumber(value)).toLocaleString(language)} DH`;

const formatDate = (value: string | null | undefined, language: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(language, { year: 'numeric', month: 'short', day: 'numeric' });
};

const getRemaining = (installment: any) =>
  Math.max(toNumber(installment?.amount) - toNumber(installment?.paidAmount), 0);

const isOverdueInstallment = (installment: any) =>
  installment?.status === 'overdue' && getRemaining(installment) > 0;

const statusConfig: Record<string, { labelKey: string; className: string; icon: any }> = {
  paid: {
    labelKey: 'students.profile.feeDetails.paid',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  overdue: {
    labelKey: 'students.profile.feeDetails.overdue',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: AlertTriangle,
  },
  partial: {
    labelKey: 'students.profile.feeDetails.partiallyPaid',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: CreditCard,
  },
  partiallyPaid: {
    labelKey: 'students.profile.feeDetails.partiallyPaid',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: CreditCard,
  },
  pending: {
    labelKey: 'students.profile.feeDetails.pending',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Clock,
  },
};

const StatusBadge = ({ status }: { status?: string | null }) => {
  const { t } = useTranslation();
  const config = statusConfig[status || ''] ?? statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${config.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {t(config.labelKey)}
    </span>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ))}
    </div>
    <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />
  </div>
);

const getFeeStatus = (fee: any, remaining: number, overdueCount: number) => {
  if (remaining <= 0) return 'paid';
  if (overdueCount > 0) return 'overdue';
  return fee?.status || 'pending';
};

export default function FeesTab({ studentId, onOpenFeeRecord }: FeesTabProps) {
  const { t, language } = useTranslation();
  const { studentFees, isStudentFeesLoading } = useFees({ studentId });

  const feeData = useMemo(() => {
    const fees = Array.isArray(studentFees?.fees) ? studentFees.fees : [];
    const summary = studentFees?.summary ?? {};
    const netAmount = toNumber(summary.netAmount) || fees.reduce((sum, fee) => sum + toNumber(fee.netAmount), 0);
    const totalPaid = toNumber(summary.totalPaid) || fees.reduce((sum, fee) => sum + toNumber(fee.paidAmount), 0);
    const totalDue = toNumber(summary.totalDue) || Math.max(netAmount - totalPaid, 0);
    const installments = fees
      .flatMap((fee) => (Array.isArray(fee.installments) ? fee.installments : []).map((installment) => ({
        ...installment,
        feeId: fee.id,
        feeName: fee.name,
        feeIcon: fee.icon,
        remaining: getRemaining(installment),
      })))
      .sort((a, b) => {
        const aPaid = a.status === 'paid';
        const bPaid = b.status === 'paid';
        if (aPaid !== bPaid) return aPaid ? 1 : -1;
        return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
      });

    const overdueInstallments = installments.filter(isOverdueInstallment);
    const nextDue = installments.find((installment) => installment.status !== 'paid' && installment.remaining > 0);
    const feeRows = fees
      .map((fee) => {
        const feeInstallments = Array.isArray(fee.installments) ? fee.installments : [];
        const feeOverdueInstallments = feeInstallments.filter(isOverdueInstallment);
        const feeNextDue = feeInstallments
          .map((installment: any) => ({
            ...installment,
            remaining: getRemaining(installment),
          }))
          .filter((installment: any) => installment.status !== 'paid' && installment.remaining > 0)
          .sort((a: any, b: any) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())[0];
        const feeNetAmount = toNumber(fee.netAmount) || feeInstallments.reduce((sum: number, installment: any) => sum + toNumber(installment.amount), 0);
        const feePaidAmount = toNumber(fee.paidAmount) || feeInstallments.reduce((sum: number, installment: any) => sum + toNumber(installment.paidAmount), 0);
        const feeRemaining = Math.max(toNumber(fee.balance ?? fee.totalDue ?? fee.dueAmount) || feeNetAmount - feePaidAmount, 0);

        return {
          ...fee,
          dueDate: feeNextDue?.dueDate ?? null,
          installmentsCount: feeInstallments.length,
          overdueCount: feeOverdueInstallments.length,
          netAmount: feeNetAmount,
          paidAmount: feePaidAmount,
          remaining: feeRemaining,
          status: getFeeStatus(fee, feeRemaining, feeOverdueInstallments.length),
        };
      })
      .sort((a, b) => {
        const aPaid = a.status === 'paid';
        const bPaid = b.status === 'paid';
        if (aPaid !== bPaid) return aPaid ? 1 : -1;

        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      });

    return {
      fees,
      summary,
      installments,
      feeRows,
      overdueInstallments,
      netAmount,
      totalPaid,
      totalDue,
      nextDue,
    };
  }, [studentFees]);

  const handleFeeClick = useCallback((fee: any) => {
    onOpenFeeRecord?.(fee?.id);
  }, [onOpenFeeRecord]);

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('students.profile.feeDetails.fee'),
      enableSorting: true,
      cell: ({ row }) => {
        const fee = row.original;

        return (
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm">
              {fee.icon || '$'}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-800">{fee.name || t('students.profile.feeDetails.fee')}</p>
              <p className="text-xs text-slate-400">
                {t('students.profile.feeDetails.installmentCount', { count: fee.installmentsCount })}
                {fee.overdueCount > 0 ? ` • ${t('students.profile.feeDetails.overdueCount', { count: fee.overdueCount })}` : ''}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'dueDate',
      header: t('students.profile.nextDue'),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium text-slate-600">{formatDate(row.original.dueDate, language)}</span>
      ),
    },
    {
      accessorKey: 'netAmount',
      header: t('common.total'),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="block whitespace-nowrap text-right font-semibold text-slate-700">
          {formatMoney(row.original.netAmount, language)}
        </span>
      ),
    },
    {
      accessorKey: 'paidAmount',
      header: t('students.profile.feeDetails.paid'),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="block whitespace-nowrap text-right font-semibold text-emerald-600">
          {formatMoney(row.original.paidAmount, language)}
        </span>
      ),
    },
    {
      accessorKey: 'remaining',
      header: t('students.profile.feeDetails.remaining'),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="block whitespace-nowrap text-right font-bold text-slate-900">
          {formatMoney(row.original.remaining, language)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('students.profile.attendanceDetails.status'),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <StatusBadge status={row.original.status} />
        </div>
      ),
    },
  ], [language, t]);

  if (!studentId) {
    return (
      <NCard className="p-8 text-center text-sm font-medium text-slate-500">
        {t('students.profile.feeDetails.studentIdRequired')}
      </NCard>
    );
  }

  if (isStudentFeesLoading) return <LoadingSkeleton />;

  if (!studentFees || feeData.fees.length === 0) {
    return (
      <NCard className="flex flex-col items-center justify-center px-4 py-14 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <CircleDollarSign className="h-6 w-6" />
        </div>
        <p className="font-bold text-slate-700">{t('students.profile.feeDetails.noneAssigned')}</p>
        <p className="mt-1 text-sm text-slate-400">{t('students.profile.feeDetails.noneAssignedHelp')}</p>
        <Link
          href={`/students/${studentId}/fees`}
          className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <FileText className="h-4 w-4" />
          {t('students.profile.feeDetails.openRecord')}
        </Link>
      </NCard>
    );
  }

  const paidPercent = feeData.netAmount > 0 ? Math.round((feeData.totalPaid / feeData.netAmount) * 100) : 0;
  const feeStats = [
    {
      icon: CircleDollarSign,
      label: t('common.total'),
      value: formatMoney(feeData.netAmount, language),
      subtext: t('students.profile.feeDetails.assignedCount', { count: feeData.fees.length }),
      iconClassName: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    },
    {
      icon: CheckCircle2,
      label: t('students.profile.feeDetails.paid'),
      value: formatMoney(feeData.totalPaid, language),
      subtext: t('students.profile.feeDetails.collectedPercent', { count: paidPercent }),
      iconClassName: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    },
    {
      icon: AlertTriangle,
      label: t('students.profile.due'),
      value: formatMoney(feeData.totalDue, language),
      subtext: t('students.profile.feeDetails.overdueInstallmentCount', { count: feeData.overdueInstallments.length }),
      iconClassName: feeData.totalDue > 0
        ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'
        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200',
    },
    {
      icon: CalendarClock,
      label: t('students.profile.nextDue'),
      value: feeData.nextDue ? formatDate(feeData.nextDue.dueDate, language) : t('common.none'),
      subtext: t('students.profile.feeDetails.oldestUnpaid'),
      iconClassName: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {feeStats.map((stat) => (
          <NStatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            subtext={stat.subtext}
            classNames={{ icon: stat.iconClassName }}
          />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('students.profile.feeDetails.assignedFees')}</h3>
            <p className="text-xs font-medium text-slate-400">
              {t('students.profile.feeDetails.feesWithInstallments', {
                fees: feeData.feeRows.length,
                installments: feeData.installments.length,
              })}
            </p>
          </div>
          {feeData.summary.lastPayment ? (
            <span className="text-xs font-bold text-slate-500">
              {t('students.profile.feeDetails.lastPayment')}: {formatDate(feeData.summary.lastPayment, language)}
            </span>
          ) : null}
        </div>

        <NTable
          data={feeData.feeRows}
          columns={columns}
          bordered={false}
          defaultMode="table"
          availableModes={['table']}
          pagination={{ pageIndex: 0, pageSize: Math.max(feeData.feeRows.length, 1) }}
          showViewToggle={false}
          showColumnVisibility={false}
          showCheckbox={false}
          showPagination={false}
          dynamicHeight={false}
          onRowClick={onOpenFeeRecord ? handleFeeClick : undefined}
          getRowClassName={() => onOpenFeeRecord ? 'cursor-pointer hover:bg-slate-50' : undefined}
          noDataText={t('students.profile.feeDetails.noneAssignedShort')}
        />
      </div>
    </div>
  );
}
