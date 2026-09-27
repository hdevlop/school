'use client';

import Link from 'next/link';
import { ChevronRight, School, UsersRound } from 'lucide-react';
import { NCard, NCardAction, NEmptyState, NSkeleton, cn, getNChartColor } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { TeacherDashboardClass } from '@sms/contracts/teacher-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { TEACHER_DASHBOARD_LINKS } from '../../config/teacherDashboardLinks';
import { CardLink } from './shared';

const VISIBLE_CLASSES = 4;

type MyClassesCardProps = {
  classes: TeacherDashboardClass[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

const ClassesSkeleton = () => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-hidden="true">
    {Array.from({ length: VISIBLE_CLASSES }, (_, index) => <NSkeleton key={index} className="h-24 w-full rounded-xl" />)}
  </div>
);

const MyClassesCard = ({ classes, loading, error, onRetry, className }: MyClassesCardProps) => {
  const { t } = useTranslation();
  const { number } = useSchoolFormat();
  const visible = (classes ?? []).slice(0, VISIBLE_CLASSES);

  return (
    <NCard
      title={t('dashboard.teacher.classes.title')}
      icon={UsersRound}
      className={cn('h-full', className)}
      loading={loading}
      skeleton={<ClassesSkeleton />}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={onRetry}
    >
      <NCardAction>
        <CardLink href={TEACHER_DASHBOARD_LINKS.classes}>{t('dashboard.teacher.classes.viewAll')}</CardLink>
      </NCardAction>

      {visible.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visible.map((item, index) => (
            <Link key={item.teacherAssignmentId} href={TEACHER_DASHBOARD_LINKS.classes} prefetch={false} className="block">
              <NCard className="relative h-full overflow-hidden ps-5 transition-colors hover:bg-accent/40 lg:ps-6 2xl:ps-7">
                <span
                  aria-hidden="true"
                  className="absolute inset-y-2 start-2 w-1 rounded-full"
                  style={{ backgroundColor: getNChartColor(index) }}
                />
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      {item.className} · {item.sectionName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{item.subjectName}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UsersRound className="size-3.5" aria-hidden="true" />
                  {number(item.studentCount)} {t('dashboard.teacher.classes.students')}
                </p>
              </NCard>
            </Link>
          ))}
        </div>
      ) : (
        <NEmptyState icon={School} title={t('dashboard.teacher.classes.empty')} className="py-6" />
      )}
    </NCard>
  );
};

export default MyClassesCard;
