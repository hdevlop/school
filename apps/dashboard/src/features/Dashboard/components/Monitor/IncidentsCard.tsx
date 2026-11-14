'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';

import Link from 'next/link';
import { ChevronRight, ShieldAlert } from 'lucide-react';
import { NBadge, NCard, NCardAction, NEmptyState, NSkeleton, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { MonitorDashboardIncident } from '@sms/contracts/monitor-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { SEVERITY_COLORS, severityClassName } from '@/features/Discipline/disciplineConstants';
import { MONITOR_DASHBOARD_LINKS } from '../../config/monitorDashboardLinks';
import { CardLink, FILL_CARD, IconTile, CARD_EMPTY } from '../Teacher/shared';

type IncidentsCardProps = {
  incidents: MonitorDashboardIncident[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

const IncidentsSkeleton = () => (
  <div className="flex flex-col gap-3" aria-hidden="true">
    {Array.from({ length: 3 }, (_, index) => <NSkeleton key={index} className="h-14 w-full rounded-lg" />)}
  </div>
);

// The latest open incidents in the monitor's sections.
const IncidentsCard = ({ incidents, loading, error, onRetry, className }: IncidentsCardProps) => {
  const { t } = useTranslation();
  const { displayDate } = useSchoolFormat();
  const rows = incidents ?? [];

  return (
    <NCard
      title={t('dashboard.monitor.incidents.title')}
      icon={ShieldAlert}
      className={cn('h-full', className)}
      classNames={FILL_CARD}
      loading={loading}
      skeleton={<IncidentsSkeleton />}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={onRetry}
    >
      <NCardAction>
        <CardLink href={MONITOR_DASHBOARD_LINKS.discipline}>{t('dashboard.monitor.incidents.viewAll')}</CardLink>
      </NCardAction>

      {rows.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={MONITOR_DASHBOARD_LINKS.discipline}
                prefetch={false}
                className="flex items-center gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-accent/50"
              >
                <IconTile icon={ShieldAlert} tone={row.severity === 'critical' ? 'destructive' : 'warning'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{row.studentName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t(`discipline.categories.${row.category}`)} • {row.className} · {row.sectionName} • {displayDate(row.incidentAt.slice(0, 10))}
                  </p>
                </div>
                <NBadge
                  color={SEVERITY_COLORS[row.severity]}
                  className={severityClassName(row.severity)}
                  label={t(`discipline.severity.${row.severity}`)}
                  look="soft"
                />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <NEmptyState icon={FEATURE_ICONS.discipline} title={t('dashboard.monitor.incidents.empty')} className={CARD_EMPTY} />
      )}
    </NCard>
  );
};

export default IncidentsCard;
