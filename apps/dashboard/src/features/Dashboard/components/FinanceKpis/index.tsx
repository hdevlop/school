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
  useDashboardYear,
  useFinanceKpis,
} from '@/features/Dashboard/hooks/useDashboardHooks';
import { useTranslation } from 'najm-i18n/react';
import { NSkeletonWidgets, NStatCard } from 'najm-kit';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

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
  const { t } = useTranslation();
  const { majorMoney, percentFromHundred } = useSchoolFormat();
  const { year, isOtherYear } = useDashboardYear();
  const { data: widgets, isLoading: widgetsLoading } = useDashboardWidgets();
  const { data: kpis, isLoading: kpisLoading } = useFinanceKpis();

  if (widgetsLoading || kpisLoading) return <NSkeletonWidgets />;

  const totalStudents = pickCountByIcon(widgets, 'studentImage');
  const totalTeachers = pickCountByIcon(widgets, 'teacherImage');

  // A year other than the active one has no "this month": its cards show the
  // whole year's cash instead, and name the year. Teachers are not recorded
  // per year yet, so that card says it shows today's count.
  const income = Number((isOtherYear ? kpis?.incomeYear : kpis?.incomeMonth) ?? 0);
  const expenses = Number((isOtherYear ? kpis?.expensesYear : kpis?.expensesMonth) ?? 0);
  const netBalance = Number((isOtherYear ? kpis?.netBalanceYear : kpis?.netBalance) ?? 0);
  const collectionRateYTD = Number(kpis?.collectionRateYTD ?? 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <KpiCard
        title={isOtherYear ? t('dashboard.finance.studentsYear', { year }) : t('dashboard.finance.totalStudents')}
        value={totalStudents}
        icon={Users}
      />
      <KpiCard
        title={isOtherYear ? t('dashboard.finance.teachersCurrent') : t('dashboard.finance.totalTeachers')}
        value={totalTeachers}
        icon={GraduationCap}
      />
      <KpiCard
        title={isOtherYear ? t('dashboard.finance.incomeYear', { year }) : t('dashboard.finance.incomeMonth')}
        value={majorMoney(income)}
        icon={TrendingUp}
      />
      <KpiCard
        title={isOtherYear ? t('dashboard.finance.expensesYear', { year }) : t('dashboard.finance.expensesMonth')}
        value={majorMoney(expenses)}
        icon={TrendingDown}
      />
      <KpiCard
        title={isOtherYear ? t('dashboard.finance.netBalanceYear', { year }) : t('dashboard.finance.netBalance')}
        value={majorMoney(netBalance)}
        icon={Wallet}
      />
      <KpiCard
        title={isOtherYear ? t('dashboard.finance.collectionRateYear', { year }) : t('dashboard.finance.collectionRateYTD')}
        value={percentFromHundred(collectionRateYTD)}
        icon={Target}
      />
    </div>
  );
};

export default FinanceKpis;
