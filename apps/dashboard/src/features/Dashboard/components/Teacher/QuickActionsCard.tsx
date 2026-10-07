'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, ClipboardCheck, ClipboardPlus, PenLine, ShieldAlert, Zap, type LucideIcon } from 'lucide-react';
import { NButton, NCard, NajmScroll, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { TEACHER_DASHBOARD_LINKS } from '../../config/teacherDashboardLinks';
import { SCROLL_CARD, SCROLL_LIST } from './shared';

type QuickAction = {
  key: string;
  icon: LucideIcon;
  href: string;
};

// The teacher's everyday tasks, each one click from the overview. Every
// destination is a route the teacher's sidebar already offers.
const ACTIONS: QuickAction[] = [
  { key: 'takeAttendance', icon: ClipboardCheck, href: TEACHER_DASHBOARD_LINKS.attendance },
  { key: 'enterGrades', icon: PenLine, href: TEACHER_DASHBOARD_LINKS.grades },
  { key: 'planAssessment', icon: ClipboardPlus, href: TEACHER_DASHBOARD_LINKS.assessments },
  { key: 'reportIncident', icon: ShieldAlert, href: TEACHER_DASHBOARD_LINKS.discipline },
  { key: 'viewTimetable', icon: CalendarDays, href: TEACHER_DASHBOARD_LINKS.timetable },
];

const QuickActionsCard = ({ className }: { className?: string }) => {
  const { t } = useTranslation();

  return (
    <NCard
      title={t('dashboard.teacher.quickActions.title')}
      icon={Zap}
      className={cn('h-full', className)}
      classNames={SCROLL_CARD}
    >
      <NajmScroll axis="y" className={SCROLL_LIST}>
        <ul className="flex flex-col gap-2 fit:pe-3">
          {ACTIONS.map(({ key, icon: Icon, href }) => (
            <li key={key}>
              <NButton asChild variant="outline" className="h-auto min-h-12 w-full justify-start gap-3 px-3 py-1.5 text-start">
                <Link href={href} prefetch={false}>
                  <span className="flex shrink-0 items-center justify-center rounded-lg bg-primary/10 p-1.5">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm/5 font-semibold">{t(`dashboard.teacher.quickActions.${key}`)}</span>
                    <span className="block truncate text-xs/4 font-normal text-muted-foreground">
                      {t(`dashboard.teacher.quickActions.${key}Hint`)}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </NButton>
            </li>
          ))}
        </ul>
      </NajmScroll>
    </NCard>
  );
};

export default QuickActionsCard;
