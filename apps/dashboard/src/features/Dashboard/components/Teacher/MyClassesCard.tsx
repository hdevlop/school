'use client';

import Link from 'next/link';
import { ChevronRight, School, UsersRound } from 'lucide-react';
import { NCard, NCardAction, NEmptyState, NSkeleton, NajmScroll, cn, getNChartColor } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { TeacherDashboardClass } from '@sms/contracts/teacher-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { TEACHER_DASHBOARD_LINKS } from '../../config/teacherDashboardLinks';
import { CardLink, SCROLL_CARD, SCROLL_LIST } from './shared';

const VISIBLE_CLASSES = 5;

type MyClassesCardProps = {
  classes: TeacherDashboardClass[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

const ClassesSkeleton = () => (
  <div className="flex flex-col gap-2" aria-hidden="true">
    {Array.from({ length: 3 }, (_, index) => <NSkeleton key={index} className="h-14 w-full rounded-lg" />)}
  </div>
);

// One row per section: a teacher with two subjects in 1AC · A sees it once,
// with both subjects, rather than twice.
const bySection = (classes: TeacherDashboardClass[]) => {
  const sections = new Map<string, { key: string; className: string; sectionName: string; subjects: string[]; studentCount: number }>();
  for (const item of classes) {
    const section = sections.get(item.sectionId)
      ?? { key: item.sectionId, className: item.className, sectionName: item.sectionName, subjects: [], studentCount: item.studentCount };
    if (!section.subjects.includes(item.subjectName)) section.subjects.push(item.subjectName);
    sections.set(item.sectionId, section);
  }
  return [...sections.values()];
};

const MyClassesCard = ({ classes, loading, error, onRetry, className }: MyClassesCardProps) => {
  const { t } = useTranslation();
  const { number } = useSchoolFormat();
  // Every section is listed; the card scrolls on large screens and phones
  // keep the first few.
  const sections = bySection(classes ?? []);

  return (
    <NCard
      title={t('dashboard.teacher.classes.title')}
      icon={UsersRound}
      className={cn('h-full', className)}
      classNames={SCROLL_CARD}
      loading={loading}
      skeleton={<ClassesSkeleton />}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={onRetry}
    >
      <NCardAction>
        <CardLink href={TEACHER_DASHBOARD_LINKS.classes}>{t('dashboard.teacher.classes.viewAll')}</CardLink>
      </NCardAction>

      {sections.length ? (
        <NajmScroll axis="y" className={SCROLL_LIST}>
          {/* Room on the end for the overlay scrollbar, clear of the chevrons. */}
          <ul className="flex flex-col gap-2 fit:pe-3">
            {sections.map((item, index) => (
              <li key={item.key} className={index >= VISIBLE_CLASSES ? 'max-lg:hidden' : undefined}>
                <Link
                  href={TEACHER_DASHBOARD_LINKS.classes}
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
                      {item.className} · {item.sectionName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{item.subjects.join(', ')}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <UsersRound className="size-3.5" aria-hidden="true" />
                    {number(item.studentCount)} {t('dashboard.teacher.classes.students')}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </NajmScroll>
      ) : (
        <NEmptyState icon={School} title={t('dashboard.teacher.classes.empty')} className="py-4" />
      )}
    </NCard>
  );
};

export default MyClassesCard;
