'use client';

import { Bell, DoorOpen, UserRound, UsersRound } from 'lucide-react';
import { NStatCard } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { SecretaryDashboardOverview } from '@sms/contracts/secretary-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';

export default function SecretaryKpis({ overview, loading }: { overview: SecretaryDashboardOverview | undefined; loading: boolean }) {
  const { t } = useTranslation();
  const { number } = useSchoolFormat();
  const { can } = useViewerRole();
  const cards = [
    ...(can('read:students') ? [{ key: 'students', icon: UsersRound, label: 'dashboard.secretary.kpis.students', value: overview?.students }] : []),
    ...(can('read:parents') ? [{ key: 'parents', icon: UserRound, label: 'dashboard.secretary.kpis.parents', value: overview?.parents }] : []),
    ...(can('read:visit-requests') ? [{ key: 'visits', icon: DoorOpen, label: 'dashboard.secretary.kpis.newRequests', value: overview?.visitRequests?.newRequests }] : []),
    { key: 'notifications', icon: Bell, label: 'dashboard.teacher.kpis.notifications', value: overview?.unreadNotifications },
  ];

  return (
    <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:*:min-w-0 xl:*:flex-1">
      {cards.map(({ key, icon, label, value }) => (
        <NStatCard key={key} icon={icon} label={t(label)} value={number(value ?? 0)} loading={loading} />
      ))}
    </div>
  );
}
