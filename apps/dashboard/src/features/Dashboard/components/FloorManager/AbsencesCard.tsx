'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';

import Link from 'next/link';
import { UserX } from 'lucide-react';
import { NAvatar, NBadge, NCard, NCardAction, NEmptyState, NSkeleton, NajmScroll, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { FloorManagerDashboardAbsence } from '@sms/contracts/floor-manager-dashboard';
import { FLOOR_MANAGER_DASHBOARD_LINKS, sectionAttendanceHref } from '../../config/floorManagerDashboardLinks';
import { CardLink, SCROLL_CARD, SCROLL_LIST } from '../Teacher/shared';

const VISIBLE_ABSENCES = 5;

type AbsencesCardProps = {
  absences: FloorManagerDashboardAbsence[] | undefined;
  // Without a school day there is no register to be absent from.
  schoolDay: boolean | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

const AbsencesSkeleton = () => (
  <div className="flex flex-col gap-2" aria-hidden="true">
    {Array.from({ length: 4 }, (_, index) => <NSkeleton key={index} className="h-12 w-full rounded-lg" />)}
  </div>
);

// Today's absent students first, then late arrivals.
const AbsencesCard = ({ absences, schoolDay, loading, error, onRetry, className }: AbsencesCardProps) => {
  const { t } = useTranslation();
  const rows = absences ?? [];

  return (
    <NCard
      title={t('dashboard.floorManager.absences.title')}
      icon={UserX}
      className={cn('h-full', className)}
      classNames={SCROLL_CARD}
      loading={loading}
      skeleton={<AbsencesSkeleton />}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={onRetry}
    >
      <NCardAction>
        <CardLink href={FLOOR_MANAGER_DASHBOARD_LINKS.attendance}>{t('dashboard.floorManager.absences.viewAll')}</CardLink>
      </NCardAction>

      {rows.length ? (
        <NajmScroll axis="y" className={SCROLL_LIST}>
          <ul className="flex flex-col divide-y divide-border/70 fit:pe-3">
            {rows.map((row, index) => (
              <li key={row.studentId} className={index >= VISIBLE_ABSENCES ? 'max-lg:hidden' : undefined}>
                <Link
                  href={sectionAttendanceHref(row)}
                  prefetch={false}
                  className="flex items-center gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-accent/50"
                >
                  <NAvatar src={row.image} fallback={row.studentName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{row.studentName}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.className} · {row.sectionName}</p>
                  </div>
                  <NBadge status={row.status} />
                </Link>
              </li>
            ))}
          </ul>
        </NajmScroll>
      ) : (
        <NEmptyState
          icon={FEATURE_ICONS.studentAttendance}
          title={t(schoolDay === false ? 'dashboard.floorManager.absences.noSchool' : 'dashboard.floorManager.absences.empty')}
          className="py-4"
        />
      )}
    </NCard>
  );
};

export default AbsencesCard;
