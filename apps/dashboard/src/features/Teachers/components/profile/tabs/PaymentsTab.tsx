"use client";

import { FEATURE_ICONS } from '@/shared/featureIcons';
import React, { useMemo } from 'react';
import { NTable, NEmptyState } from 'najm-kit';
import { Badge } from 'najm-kit';
import { Banknote, CalendarDays, Clock, ReceiptText, SearchX } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

interface PaymentsTabProps {
  teacher: any;
}

const normalizeEmploymentType = (value?: string | null) => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('part') || normalized.includes('contract') || normalized.includes('temporary') || normalized.includes('vacataire')) {
    return 'vacataire';
  }
  return 'permanent';
};

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-slate-500">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className="mt-1 text-lg font-bold text-slate-800">{value}</div>
  </div>
);

const PaymentsTab: React.FC<PaymentsTabProps> = ({ teacher }) => {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const contractType = normalizeEmploymentType(teacher?.employmentType);
  const monthlySalary = Number(teacher?.salary || 0);
  const workloadHours = Number(teacher?.workloadHours || 0);
  const hourlyRate = contractType === 'vacataire' && workloadHours > 0
    ? monthlySalary / workloadHours
    : 0;

  const sampleRows = contractType === 'vacataire'
    ? [
      {
        id: 'current-period',
        period: t('teachers.profile.currentPeriod'),
        type: t('teachers.profile.hourly'),
        base: workloadHours ? `${workloadHours}h x ${majorMoney(hourlyRate)}` : t('teachers.profile.hoursNotSet'),
        amount: workloadHours ? majorMoney(workloadHours * hourlyRate) : majorMoney(0),
        status: 'pending',
      },
    ]
    : [
      {
        id: 'current-month',
        period: t('teachers.profile.currentMonth'),
        type: t('teachers.profile.monthlySalary'),
        base: majorMoney(monthlySalary),
        amount: majorMoney(monthlySalary),
        status: 'pending',
      },
    ];

  const columns = useMemo(() => [
    {
      accessorKey: 'period',
      header: t('teachers.profile.table.period'),
      enableSorting: true,
      cell: ({ getValue }) => <span className="font-medium text-slate-700">{getValue() as string}</span>,
    },
    {
      accessorKey: 'type',
      header: t('teachers.profile.table.type'),
      enableSorting: true,
    },
    {
      accessorKey: 'base',
      header: t('teachers.profile.table.base'),
      enableSorting: false,
    },
    {
      accessorKey: 'amount',
      header: t('teachers.profile.table.amount'),
      enableSorting: true,
      cell: ({ getValue }) => <span className="font-semibold text-slate-800">{getValue() as string}</span>,
    },
    {
      accessorKey: 'status',
      header: t('teachers.profile.table.status'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
          {t(`payroll.status.${getValue()}`)}
        </Badge>
      ),
    },
  ], [t]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard
          icon={ReceiptText}
          label={t('teachers.profile.contractType')}
          value={t(`payroll.types.${contractType}`)}
        />
        <StatCard
          icon={Banknote}
          label={contractType === 'vacataire' ? t('teachers.profile.estimatedRate') : t('teachers.profile.monthlySalary')}
          value={contractType === 'vacataire' ? majorMoney(hourlyRate) : majorMoney(monthlySalary)}
        />
        <StatCard
          icon={Clock}
          label={t('teachers.form.workloadHours')}
          value={workloadHours ? `${workloadHours}h` : t('common.notSpecified')}
        />
        <StatCard
          icon={CalendarDays}
          label={t('payroll.status.pending')}
          value={sampleRows[0]?.amount || majorMoney(0)}
        />
      </div>

      <NTable
        data={sampleRows}
        columns={columns}
        dynamicHeight={false}
        showPagination={false}
        showAddButton={false}
        showViewToggle={false}
        showColumnVisibility={false}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.payments}
            title={t('teachers.profile.noPayments')}
          />
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
    </div>
  );
};

export default PaymentsTab;
