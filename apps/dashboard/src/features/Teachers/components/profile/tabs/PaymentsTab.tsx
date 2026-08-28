"use client";

import React, { useMemo } from 'react';
import { NTable } from 'najm-kit';
import { Badge } from 'najm-kit';
import { Banknote, CalendarDays, Clock, ReceiptText } from 'lucide-react';
import { useTranslation } from '@/hooks/useLanguage';

interface PaymentsTabProps {
  teacher: any;
}

const money = (value?: string | number | null) => {
  const numeric = Number(value || 0);
  return `${numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })} DH`;
};

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
        period: 'Current period',
        type: 'Hourly',
        base: workloadHours ? `${workloadHours}h x ${money(hourlyRate)}` : 'Hours not set',
        amount: workloadHours ? money(workloadHours * hourlyRate) : money(0),
        status: 'pending',
      },
    ]
    : [
      {
        id: 'current-month',
        period: 'Current month',
        type: 'Monthly salary',
        base: money(monthlySalary),
        amount: money(monthlySalary),
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
          {getValue() as string}
        </Badge>
      ),
    },
  ], [t]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard
          icon={ReceiptText}
          label="Contract"
          value={contractType === 'vacataire' ? 'Vacataire' : 'Permanent'}
        />
        <StatCard
          icon={Banknote}
          label={contractType === 'vacataire' ? 'Estimated Rate' : 'Monthly Salary'}
          value={contractType === 'vacataire' ? money(hourlyRate) : money(monthlySalary)}
        />
        <StatCard
          icon={Clock}
          label="Workload"
          value={workloadHours ? `${workloadHours}h` : 'Not set'}
        />
        <StatCard
          icon={CalendarDays}
          label="Pending"
          value={sampleRows[0]?.amount || money(0)}
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
        noDataText="No teacher payments recorded"
      />
    </div>
  );
};

export default PaymentsTab;
