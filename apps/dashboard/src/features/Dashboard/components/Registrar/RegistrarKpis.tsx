'use client';

import { Award, BookOpenCheck, ClipboardX, Hourglass, TrendingUp, UserX, type LucideIcon } from 'lucide-react';
import { NStatCard } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { RegistrarDashboardGrades } from '@sms/contracts/registrar-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

type Kpi = { key: string; icon: LucideIcon; value: string; alert?: boolean };

// The grade figures a registrar checks before sending marks to Massar.
export default function RegistrarKpis({ grades, loading }: { grades: RegistrarDashboardGrades | null | undefined; loading: boolean }) {
  const { t } = useTranslation();
  const { number, percent } = useSchoolFormat();
  const share = (value: number | null | undefined) => percent(value == null ? null : value / 100, 0);
  const kpis: Kpi[] = [
    { key: 'average', icon: TrendingUp, value: share(grades?.average) },
    { key: 'passRate', icon: Award, value: share(grades?.passRate) },
    { key: 'recorded', icon: BookOpenCheck, value: number(grades?.recorded ?? 0) },
    { key: 'pending', icon: Hourglass, value: number(grades?.pending ?? 0) },
    { key: 'missed', icon: UserX, value: number(grades?.missed ?? 0) },
    { key: 'testsAwaitingGrades', icon: ClipboardX, value: number(grades?.testsAwaitingGrades ?? 0), alert: !!grades?.testsAwaitingGrades },
  ];

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3 lg:gap-3 xl:grid-cols-6">
      {kpis.map(({ key, icon, value, alert }) => (
        <NStatCard
          key={key}
          icon={icon}
          label={t(`dashboard.registrar.kpis.${key}`)}
          value={value}
          loading={loading}
          classNames={{ value: alert ? 'text-destructive' : undefined }}
        />
      ))}
    </div>
  );
}
