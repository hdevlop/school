"use client";

import React from 'react';
import { Calendar, CreditCard, FileText, User, Receipt } from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

const PaymentCard = ({ data }) => {
  const { t } = useTranslation();
  const { displayDate, majorMoney } = useSchoolFormat();
  const payment = data;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <Label className="text-lg font-bold text-green-600">
            {majorMoney(payment.amount || 0)}
          </Label>
          <Label className="text-sm text-gray-500">
            {payment.receiptNumber || t('common.notAvailable')}
          </Label>
        </div>
        <NBadge status={payment.status} />
      </div>

      {/* Payment Details */}
      <div className="space-y-2">
        <NSectionInfo
          icon={Calendar}
          iconColor="text-muted-foreground"
          label={t('payments.table.paymentDate')}
          value={displayDate(payment.paymentDate)}
        />

        <NSectionInfo
          icon={CreditCard}
          iconColor="text-muted-foreground"
          label={t('payments.table.paymentMethod')}
          value={payment.paymentMethod}
        />

        {payment.transactionRef && (
          <NSectionInfo
            icon={Receipt}
            iconColor="text-muted-foreground"
            label={t('payments.table.transactionRef')}
            value={payment.transactionRef}
          />
        )}

        {payment.checkNumber && (
          <NSectionInfo
            icon={FileText}
            iconColor="text-muted-foreground"
            label={t('payments.table.checkNumber')}
            value={payment.checkNumber}
          />
        )}

        {payment.checkDueDate && (
          <NSectionInfo
            icon={Calendar}
            iconColor="text-muted-foreground"
            label={t('payments.table.checkDueDate')}
            value={displayDate(payment.checkDueDate)}
          />
        )}

        {payment.studentName && (
          <NSectionInfo
            icon={User}
            iconColor="text-muted-foreground"
            label={t('payments.table.student')}
            value={payment.studentName}
          />
        )}

        {payment.notes && (
          <div className="pt-2 border-t">
            <Label className="text-xs text-gray-500">
              {t('payments.table.notes')}
            </Label>
            <p className="text-sm text-gray-700 mt-1">{payment.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentCard;
