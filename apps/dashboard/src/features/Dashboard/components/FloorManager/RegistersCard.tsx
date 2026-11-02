'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';

import Link from 'next/link';
import { CheckCircle2, ChevronRight, ClipboardCheck, UsersRound } from 'lucide-react';
import { NCard, NCardAction, NEmptyState, NSkeleton, NajmScroll, cn, getNChartColor } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { FloorManagerDashboardSection } from '@sms/contracts/floor-manager-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { FLOOR_MANAGER_DASHBOARD_LINKS, sectionAttendanceHref } from '../../config/floorManagerDashboardLinks';
import { CardLink, SCROLL_CARD, SCROLL_LIST } from '../Teacher/shared';

const VISIBLE_SECTIONS = 5;

type RegistersCardProps = {
  sections: FloorManagerDashboardSection[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

const RegistersSkeleton = () => (
  <div className="flex flex-col gap-2" aria-hidden="true">
    {Array.from({ length: 4 }, (_, index) => <NSkeleton key={index} className="h-14 w-full rounded-lg" />)}
  </div>
);

// Each section of the floor manager's grades, with today's register: taken,
// with its absences and late arrivals, or still to take.
const RegistersCard = ({ sections, loading, error, onRetry, className }: RegistersCardProps) => {
  const { t } = useTranslation();
  const { number } = useSchoolFormat();
  const rows = sections ?? [];

  return (
    <NCard
      title={t('dashboard.floorManager.registers.title')}
      icon={ClipboardCheck}
      className={cn('h-full', className)}
      classNames={SCROLL_CARD}
      loading={loading}
      skeleton={<RegistersSkeleton />}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={onRetry}
    >
      <NCardAction>
        <CardLink href={FLOOR_MANAGER_DASHBOARD_LINKS.attendance}>{t('dashboard.floorManager.registers.viewAll')}</CardLink>
      </NCardAction>

      {rows.length ? (
        <NajmScroll axis="y" className={SCROLL_LIST}>
          <ul className="flex flex-col gap-2 fit:pe-3">
            {rows.map((row, index) => (
              <li key={row.sectionId} className={index >= VISIBLE_SECTIONS ? 'max-lg:hidden' : undefined}>
                <Link
                  href={sectionAttendanceHref(row)}
                  prefetch={false}
                  className="flex items-center gap-3 rounded-lg border border-border/50 p-2 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span
                    aria-hidden="true"
                    className="h-9 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: getNChartColor(index) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {row.className} · {row.sectionName}
                    </p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <UsersRound className="size-3.5 shrink-0" aria-hidden="true" />
                      {number(row.studentCount)} {t('dashboard.teacher.classes.students')}
                    </p>
                  </div>
                  {row.registerTaken ? (
                    <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                      <span className="flex items-center gap-1 font-medium text-success">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        {t('dashboard.floorManager.registers.taken')}
                      </span>
                      <span className="text-muted-foreground">
                        {t('dashboard.floorManager.registers.counts', { absent: number(row.absent), late: number(row.late) })}
                      </span>
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {t('dashboard.floorManager.registers.pending')}
                    </span>
                  )}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </NajmScroll>
      ) : (
        <NEmptyState icon={FEATURE_ICONS.sections} title={t('dashboard.floorManager.registers.empty')} className="py-4" />
      )}
    </NCard>
  );
};

export default RegistersCard;
