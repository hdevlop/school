'use client';

import React from 'react';
import { NCard } from 'najm-kit';
import { Receipt, Banknote, CreditCard, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NSkeletonEventList } from 'najm-kit';
import { useFinanceRecentPayments } from '@/features/Dashboard/hooks/useDashboardHooks';
import { useTranslation } from '@/hooks/useLanguage';
import { formatMAD, type SupportedLocale } from '@/lib/format';

interface RecentPaymentsProps {
  className?: string;
}

const methodIcon = (method: string) => {
  switch (method) {
    case 'cash':
      return Banknote;
    case 'check':
      return FileText;
    case 'bankTransfer':
      return CreditCard;
    default:
      return Receipt;
  }
};

const formatDate = (d: string | null | undefined) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
};

const RecentPayments: React.FC<RecentPaymentsProps> = ({ className = '' }) => {
  const { t, language } = useTranslation();
  const locale = (language as SupportedLocale) ?? 'en';
  const { data, isLoading } = useFinanceRecentPayments(6);

  type PaymentRow = {
    paymentId: string;
    studentId: string;
    studentName: string;
    amount: number;
    method: string;
    paidAt: string | null;
  };
  const rows: PaymentRow[] = Array.isArray(data) ? (data as PaymentRow[]).slice(0, 6) : [];

  return (
    <NCard
      title={t('dashboard.finance.recentPayments')}
      icon={Receipt}
      className={cn('flex w-full h-full', className)}
      loading={isLoading}
      skeleton={<NSkeletonEventList />}
    >
      <div className="flex flex-col gap-2 overflow-auto">
        {rows.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6">
            {t('dashboard.finance.noRecentPayments')}
          </div>
        )}
        {rows.map((row) => {
          const Icon = methodIcon(row.method);
          return (
            <div
              key={row.paymentId}
              className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/50 hover:bg-muted/30"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold truncate">{row.studentName}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(row.paidAt)}</span>
                </div>
              </div>
              <span className="text-sm font-semibold text-emerald-600">
                {formatMAD(Number(row.amount ?? 0), locale)}
              </span>
            </div>
          );
        })}
      </div>
    </NCard>
  );
};

export default RecentPayments;
