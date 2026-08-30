'use client';

import { NButton } from 'najm-kit';

import React from 'react';
import { NAvatar, NCard } from 'najm-kit';
import { Clock, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NSkeletonEventList } from 'najm-kit';
import { useFinanceOverdue } from '@/features/Dashboard/hooks/useDashboardHooks';
import { useTranslation } from '@/hooks/useLanguage';
import { formatMAD, type SupportedLocale } from '@/lib/format';
import { getAvatarFallback, getStudentAvatar, personAvatarClassNames } from '@/lib/avatar';

interface OverdueFeesProps {
  className?: string;
}

const OverdueFees: React.FC<OverdueFeesProps> = ({ className = '' }) => {
  const { t, language } = useTranslation();
  const locale = (language as SupportedLocale) ?? 'en';
  const { data, isLoading } = useFinanceOverdue(6);

  type OverdueRow = {
    studentId: string;
    studentName: string;
    studentImage: string | null;
    gender: string | null;
    totalOverdue: number;
    daysOverdue: number;
    oldestDueDate: string | null;
  };
  const rows: OverdueRow[] = Array.isArray(data) ? (data as OverdueRow[]).slice(0, 5) : [];

  return (
    <NCard
      title={t('dashboard.finance.overdueFees')}
      icon={Clock}
      className={cn('flex w-full h-full', className)}
      loading={isLoading}
      skeleton={<NSkeletonEventList />}
    >
      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-auto">
        {rows.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6">
            {t('dashboard.finance.noOverdue')}
          </div>
        )}
        {rows.map((row) => (
          <div
            key={row.studentId}
            className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/50 hover:bg-muted/30"
          >
            <div className="flex items-center gap-2 min-w-0">
              <NAvatar
                src={row.studentImage}
                fallbackSrc={getStudentAvatar(row.gender)}
                fallback={getAvatarFallback(row.studentName)}
                alt={row.studentName}
                size="sm"
                classNames={personAvatarClassNames}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate">{row.studentName}</span>
                <span className="text-xs text-muted-foreground">
                  {row.daysOverdue} {t('dashboard.finance.daysOverdue')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold text-red-600">
                {formatMAD(Number(row.totalOverdue ?? 0), locale)}
              </span>
              <NButton size="sm" variant="outline" className="h-7 px-2">
                <Bell className="w-3.5 h-3.5" />
              </NButton>
            </div>
          </div>
        ))}
      </div>
    </NCard>
  );
};

export default OverdueFees;
