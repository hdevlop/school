'use client';

import React from 'react';
import {
  Users,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
} from 'lucide-react';
import {
  useDashboardWidgets,
  useFinanceKpis,
} from '@/features/Dashboard/hooks/useDashboardHooks';
import { useTranslation } from '@/hooks/useLanguage';
import { NSkeletonWidgets, NStatCard } from 'najm-kit';
import { formatMAD, formatPercent, type SupportedLocale } from '@/lib/format';

type KpiCardProps = {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
};

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon }) => (
  <NStatCard icon={icon} label={title} value={value} />
);

type WidgetEntry = { icon?: string; value?: number | string };
const pickCountByIcon = (widgets: unknown, icon: string): number => {
  if (!Array.isArray(widgets)) return 0;
  const w = (widgets as WidgetEntry[]).find((entry) => entry?.icon === icon);
  return Number(w?.value ?? 0);
};

const FinanceKpis: React.FC = () => {
  const { t, language } = useTranslation();
  const locale = (language as SupportedLocale) ?? 'en';
  const { data: widgets, isLoading: widgetsLoading } = useDashboardWidgets();
  const { data: kpis, isLoading: kpisLoading } = useFinanceKpis();

  if (widgetsLoading || kpisLoading) return <NSkeletonWidgets />;

  const totalStudents = pickCountByIcon(widgets, 'studentImage');
  const totalTeachers = pickCountByIcon(widgets, 'teacherImage');

  const incomeMonth = Number(kpis?.incomeMonth ?? 0);
  const expensesMonth = Number(kpis?.expensesMonth ?? 0);
  const netBalance = Number(kpis?.netBalance ?? 0);
  const collectionRateYTD = Number(kpis?.collectionRateYTD ?? 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <KpiCard
        title={t('dashboard.finance.totalStudents')}
        value={totalStudents}
        icon={Users}
      />
      <KpiCard
        title={t('dashboard.finance.totalTeachers')}
        value={totalTeachers}
        icon={GraduationCap}
      />
      <KpiCard
        title={t('dashboard.finance.incomeMonth')}
        value={formatMAD(incomeMonth, locale)}
        icon={TrendingUp}
      />
      <KpiCard
        title={t('dashboard.finance.expensesMonth')}
        value={formatMAD(expensesMonth, locale)}
        icon={TrendingDown}
      />
      <KpiCard
        title={t('dashboard.finance.netBalance')}
        value={formatMAD(netBalance, locale)}
        icon={Wallet}
      />
      <KpiCard
        title={t('dashboard.finance.collectionRateYTD')}
        value={formatPercent(collectionRateYTD, locale)}
        icon={Target}
      />
    </div>
  );
};

export default FinanceKpis;
