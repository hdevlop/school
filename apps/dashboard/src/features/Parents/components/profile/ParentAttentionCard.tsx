'use client';

import Link from 'next/link';
import { AlertCircle, CalendarX2, Check, Clock3, ClipboardList, ShieldAlert, TrendingDown, Wallet, type LucideIcon } from 'lucide-react';
import { NCard, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

type ParentAttentionCardProps = {
  overdueAmount: number;
  absences: number;
  lateArrivals: number;
  upcomingAssessments: number;
  lowGrades: number;
  /** Null when the viewer may not read discipline: the row is left out. */
  openIncidents: number | null;
  /** Where each row leads: the child's own pages when there is one child. */
  links: { fees: string; attendance: string; assessments: string; grades: string; discipline: string };
  className?: string;
};

type AttentionRow = {
  key: string;
  label: string;
  icon: LucideIcon;
  // The dot that tells the rows apart at a glance.
  dot: string;
  href: string;
  count: number;
  value: string;
};

/**
 * What a family has to act on, one line per kind, with its count or a check
 * once it is clear. The parent's version of the teacher's Needs Attention card.
 */
const ParentAttentionCard = ({
  overdueAmount,
  absences,
  lateArrivals,
  upcomingAssessments,
  lowGrades,
  openIncidents,
  links,
  className,
}: ParentAttentionCardProps) => {
  const { t } = useTranslation();
  const { number, majorMoney } = useSchoolFormat();
  const label = (key: string) => t(`parents.profile.dashboard.attention.${key}`);

  const rows: AttentionRow[] = [
    {
      key: 'overduePayments',
      label: label('overduePayments'),
      icon: Wallet,
      dot: 'bg-rose-500',
      href: links.fees,
      count: overdueAmount,
      value: majorMoney(overdueAmount),
    },
    {
      key: 'absences',
      label: label('absences'),
      icon: CalendarX2,
      dot: 'bg-red-500',
      href: links.attendance,
      count: absences,
      value: number(absences),
    },
    {
      key: 'lateArrivals',
      label: label('lateArrivals'),
      icon: Clock3,
      dot: 'bg-amber-500',
      href: links.attendance,
      count: lateArrivals,
      value: number(lateArrivals),
    },
    {
      key: 'upcomingAssessments',
      label: label('upcomingAssessments'),
      icon: ClipboardList,
      dot: 'bg-sky-500',
      href: links.assessments,
      count: upcomingAssessments,
      value: number(upcomingAssessments),
    },
    {
      key: 'lowGrades',
      label: label('lowGrades'),
      icon: TrendingDown,
      dot: 'bg-orange-500',
      href: links.grades,
      count: lowGrades,
      value: number(lowGrades),
    },
    ...(openIncidents === null ? [] : [{
      key: 'openIncidents',
      label: label('openIncidents'),
      icon: ShieldAlert,
      dot: 'bg-violet-500',
      href: links.discipline,
      count: openIncidents,
      value: number(openIncidents),
    }]),
  ];

  return (
    <NCard
      title={t('dashboard.teacher.attention.title')}
      icon={AlertCircle}
      className={cn('flex h-full w-full', className)}
    >
      <ul className="flex flex-col divide-y divide-border/70">
        {rows.map(({ key, label: rowLabel, icon: Icon, dot, href, count, value }) => {
          const clear = count <= 0;
          return (
            <li key={key} className="first:[&>a]:pt-0 last:[&>a]:pb-0">
              <Link
                href={href}
                prefetch={false}
                className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={cn('size-2 shrink-0 rounded-full', dot)} aria-hidden="true" />
                  <Icon className={cn('size-4 shrink-0', clear ? 'text-muted-foreground/60' : 'text-muted-foreground')} aria-hidden="true" />
                  <span className={cn('truncate text-sm', clear ? 'text-muted-foreground' : 'text-foreground')}>{rowLabel}</span>
                </span>
                {clear ? (
                  <Check className="size-4 shrink-0 text-success" aria-label={t('dashboard.teacher.attention.allClear')} />
                ) : (
                  <strong className={cn('shrink-0 text-sm tabular-nums', key === 'overduePayments' ? 'text-destructive' : 'text-foreground')}>
                    {value}
                  </strong>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </NCard>
  );
};

export default ParentAttentionCard;
