'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, ClipboardCheck, ClipboardPlus, PenLine, ShieldAlert, Zap, type LucideIcon } from 'lucide-react';
import { NButton, NCard, NajmScroll, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { TEACHER_DASHBOARD_LINKS } from '../../config/teacherDashboardLinks';
import { SCROLL_CARD, SCROLL_LIST } from './shared';

export type QuickAction = {
  // `label` and `hint` are catalog keys.
  key: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  href: string;
};

const teacherAction = (key: string, icon: LucideIcon, href: string): QuickAction => ({
  key,
  label: `dashboard.teacher.quickActions.${key}`,
  hint: `dashboard.teacher.quickActions.${key}Hint`,
  icon,
  href,
});

// The teacher's everyday tasks, each one click from the overview. Every
// destination is a route the teacher's sidebar already offers.
const TEACHER_ACTIONS: QuickAction[] = [
  teacherAction('takeAttendance', ClipboardCheck, TEACHER_DASHBOARD_LINKS.attendance),
  teacherAction('enterGrades', PenLine, TEACHER_DASHBOARD_LINKS.grades),
  teacherAction('planAssessment', ClipboardPlus, TEACHER_DASHBOARD_LINKS.assessments),
  teacherAction('reportIncident', ShieldAlert, TEACHER_DASHBOARD_LINKS.discipline),
  teacherAction('viewTimetable', CalendarDays, TEACHER_DASHBOARD_LINKS.timetable),
];

const QuickActionsCard = ({ actions = TEACHER_ACTIONS, dense, className }: { actions?: QuickAction[]; dense?: boolean; className?: string }) => {
  const { t } = useTranslation();

  return (
    <NCard
      title={t('dashboard.teacher.quickActions.title')}
      icon={Zap}
      className={cn('h-full', className)}
      classNames={SCROLL_CARD}
    >
      <NajmScroll axis="y" className={SCROLL_LIST}>
        <ul className={cn('flex flex-col fit:pe-3', dense ? 'gap-1' : 'gap-2')}>
          {actions.map(({ key, label, hint, icon: Icon, href }) => (
            <li key={key}>
              <NButton asChild variant="outline" className={cn('h-auto w-full justify-start gap-3 px-3 text-start', dense ? 'min-h-11 py-1' : 'min-h-12 py-1.5')}>
                <Link href={href} prefetch={false}>
                  <span className="flex shrink-0 items-center justify-center rounded-lg bg-primary/10 p-1.5">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm/5 font-semibold">{t(label)}</span>
                    <span className="block truncate text-xs/4 font-normal text-muted-foreground">{t(hint)}</span>
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
