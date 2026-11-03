'use client';

import Link from 'next/link';
import { Bell, ClipboardList, DoorOpen } from 'lucide-react';
import { NBadge, NCard, NEmptyState, NSkeletonEventList } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { SecretaryDashboardOverview } from '@sms/contracts/secretary-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { SECRETARY_DASHBOARD_LINKS } from '../../config/secretaryDashboard';
import { CardLink } from '../Teacher/shared';

export default function DailyWorkCard({ overview, loading }: { overview: SecretaryDashboardOverview | undefined; loading: boolean }) {
  const { t } = useTranslation();
  const { number, displayDate } = useSchoolFormat();
  const visits = overview?.visitRequests;

  return (
    <NCard
      title={t('dashboard.secretary.dailyWork.title')}
      icon={ClipboardList}
      className="h-full"
      loading={loading}
      skeleton={<NSkeletonEventList />}
    >
      <div className="flex flex-col gap-4">
        <Link href={SECRETARY_DASHBOARD_LINKS.notifications} prefetch={false} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm hover:text-primary">
          <span className="flex items-center gap-2"><Bell className="size-4 shrink-0" />{t('dashboard.teacher.attention.notifications')}</span>
          <strong className="tabular-nums">{number(overview?.unreadNotifications ?? 0)}</strong>
        </Link>
        {visits && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{t('dashboard.secretary.dailyWork.followUp')}</p>
              <CardLink href={SECRETARY_DASHBOARD_LINKS.visitRequests}>{t('dashboard.floorManager.registers.viewAll')}</CardLink>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.secretary.dailyWork.counts', { new: number(visits.newRequests), contacted: number(visits.contactedRequests) })}
            </p>
            {visits.queue.length ? (
              <ul className="flex flex-col divide-y divide-border/70">
                {visits.queue.map((request) => (
                  <li key={request.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={SECRETARY_DASHBOARD_LINKS.visitRequests} prefetch={false} className="block truncate text-sm font-semibold hover:text-primary">{request.parentName}</Link>
                        <a href={`tel:${request.phone}`} className="mt-1 block w-fit text-xs text-primary"><bdi>{request.phone}</bdi></a>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <NBadge variant="outline">{t(`status.${request.status}`)}</NBadge>
                        {request.createdAt && <span className="text-xs text-muted-foreground">{displayDate(request.createdAt)}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <NEmptyState icon={DoorOpen} title={t('dashboard.secretary.dailyWork.empty')} />}
            <p className="text-xs text-muted-foreground">{t('dashboard.secretary.dailyWork.shared')}</p>
          </>
        )}
      </div>
    </NCard>
  );
}
