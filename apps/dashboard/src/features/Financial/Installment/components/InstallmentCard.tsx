"use client";

import React from 'react';
import { Calendar, CalendarClock, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { NBadge, NSectionInfo } from 'najm-kit';
import { Label } from 'najm-kit';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTranslation } from 'najm-i18n/react';

const InstallmentCard = ({ data }: any) => {
  const { t } = useTranslation();
  const { displayDateOnly, majorMoney } = useSchoolFormat();
  const installment = data;

  const statusConfig = {
    paid: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      label: t('fees.installmentStatus.paid')
    },
    overdue: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: AlertCircle,
      iconColor: 'text-red-600',
      label: t('fees.installmentStatus.overdue')
    },
    // Not yet due, so it reads as upcoming rather than awaiting something.
    pending: {
      bg: 'bg-sky-100',
      text: 'text-sky-700',
      border: 'border-sky-200',
      icon: CalendarClock,
      iconColor: 'text-sky-600',
      label: t('status.upcoming')
    }
  };

  const config = statusConfig[installment.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center border ${config.border}`}>
          <StatusIcon className={`w-6 h-6 ${config.iconColor}`} />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-md font-bold">
            {t('fees.installment')} #{installment.number}
          </Label>
          <NBadge className={`rounded-full font-medium border ${config.bg} ${config.text} ${config.border}`}>
            {config.label}
          </NBadge>
        </div>

        <div className="space-y-2">
          <NSectionInfo
            icon={DollarSign}
            iconColor="text-primary"
            label={t('fees.table.amount')}
            value={majorMoney(installment.amount || 0)}
            valueColor="text-primary font-semibold tabular-nums"
          />

          <NSectionInfo
            icon={Calendar}
            iconColor="text-muted-foreground"
            label={t('fees.table.dueDate')}
            value={displayDateOnly(installment.dueDate)}
            valueColor="text-muted-foreground"
          />

          {installment.paidDate && (
            <NSectionInfo
              icon={CheckCircle}
              iconColor="text-green-600"
              label={t('installments.table.paidDate')}
              value={displayDateOnly(installment.paidDate)}
              valueColor="text-green-600"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallmentCard;
