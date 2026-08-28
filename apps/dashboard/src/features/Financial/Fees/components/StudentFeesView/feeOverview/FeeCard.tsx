import React from 'react';
import { Label, SimpleTooltip } from 'najm-kit';
import { Progress } from 'najm-kit';

import { AlertTriangle, Calendar, CalendarDays, CheckCircle2, CreditCard, ReceiptText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { NBadge } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';

const FeeCard = ({ data }) => {
  const { t } = useTranslation();
  const fee = data;

  const { publicSettings } = usePublicSettings();
  const currency = publicSettings?.currency || 'USD';

  const statusStyles = {
    paid: {
      card: 'border-green-300 bg-gradient-to-br from-green-50 to-white',
      icon: 'bg-green-100 text-green-700',
    },
    partial: {
      card: 'border-blue-300 bg-gradient-to-br from-blue-50 to-white',
      icon: 'bg-blue-100 text-blue-700',
    },
    pending: {
      card: 'border-gray-200 bg-white',
      icon: 'bg-gray-100 text-gray-700',
    },
    overdue: {
      card: 'border-red-300 bg-gradient-to-br from-red-50 to-white',
      icon: 'bg-red-100 text-red-700',
    },
  };

  const style = statusStyles[fee.status] || statusStyles.pending;

  const installmentsCount = fee.installments?.length || 0;
  const paymentsCount = fee.payments?.length || 0;
  const overdueCount = fee.installments?.filter((s) => s.status === 'overdue').length || 0;

  const discountAmount = Number(fee.baseAmount ?? 0) - Number(fee.netAmount ?? 0);
  const hasDiscount = discountAmount > 0;
  const balance = Number(fee.balance) || 0;
  const isFullyPaid = balance <= 0;
  const progressPercentage = fee.netAmount > 0 ? (fee.paidAmount / fee.netAmount) * 100 : 0;

  const card = (
    <div className={`flex h-full min-h-[132px] flex-col justify-between overflow-hidden rounded-lg border p-3 transition-colors ${style.card}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl ${style.icon}`}>
          {fee.icon}
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-base text-gray-800 mb-1 block truncate">{fee.name}</Label>
          <div className="flex gap-1.5 flex-wrap">
            <Label className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
              <Calendar className="h-3 w-3" />
              {fee.schedule}
            </Label>
            <Label className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
              <CalendarDays className="h-3 w-3" />
              {fee.academicYear}
            </Label>
          </div>
        </div>
      </div>

      {/* Compact Progress Bar */}
      <div className="px-0.5 py-2">
        <Progress
          value={progressPercentage}
          color={isFullyPaid ? 'success' : 'primary'}
          className="h-1.5 overflow-hidden rounded-full"
        />
      </div>

      {/* Compact Balance + Stats Row */}
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center">
          {isFullyPaid ? (
            <NBadge look='solid' color='success' size='md' className="gap-1.5 px-2.5 py-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-semibold">PAID</span>
              {formatCurrency(fee.paidAmount, currency)}
            </NBadge>
          ) : (
            <Label className="text-md font-bold text-red-600 tabular-nums">
              {formatCurrency(fee.balance, currency)}
            </Label>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1" title={t('fees.card.installments')}>
            <ReceiptText className="h-3.5 w-3.5" />
            {installmentsCount}
          </span>
          <span className="inline-flex items-center gap-1" title={t('fees.card.payments')}>
            <CreditCard className="h-3.5 w-3.5" />
            {paymentsCount}
          </span>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-red-600" title={t('fees.card.overdueInstallments')}>
              <AlertTriangle className="h-3.5 w-3.5" />
              {overdueCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <SimpleTooltip
      disabled={!hasDiscount}
      side="top"
      align="start"
      content={
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">This fee has a discount</span>
          <span>{formatCurrency(discountAmount, currency)} reduced from the original amount.</span>
        </div>
      }
    >
      {card}
    </SimpleTooltip>
  );
};

export default FeeCard;
