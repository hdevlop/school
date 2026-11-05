'use client';

import type { ReactNode } from 'react';
import { AlertCircle, CalendarDays, ClipboardCheck, ClipboardList, ShieldAlert, UserCheck, UserRound, Users, Zap, type LucideIcon } from 'lucide-react';
import { useAuth } from 'najm-auth/client/react';
import { useTranslation } from 'najm-i18n/react';
import { NajmScroll, NCard, NPageHeader, NPageHeaderActions, NSkeleton, NSkeletonCalendar, NSkeletonChart, NSkeletonDonut, NSkeletonEventList, cn, NStatCardSkeleton } from 'najm-kit';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { canReadFinanceDashboard, schoolDashboardCards, usesFloorManagerDashboard, usesRegistrarDashboard, usesSecretaryDashboard, usesSupervisorDashboard, usesTeacherDashboard } from '../config/dashboardAudience';
import { secretaryQuickActions } from '../config/secretaryDashboard';
import { registrarQuickActions } from '../config/registrarDashboard';
import DashboardOverviewRow from './DashboardOverviewRow';

function SkeletonCard({ className, children, title, icon }: { className?: string; children: ReactNode; title?: string; icon?: LucideIcon }) {
  return (
    <NCard
      title={title ?? <NSkeleton className="h-4 w-28" />}
      icon={icon}
      className={className}
      classNames={{ content: 'flex-1 min-h-0' }}
    >
      {children}
    </NCard>
  );
}

// These roles use four cards per row, rather than the teacher's three.
// Match their mounted loading layout without importing charts or starting queries.
function StaffDashboardSkeleton({ role }: { role: 'supervisor' | 'floorManager' | 'secretary' }) {
  const { t } = useTranslation();
  const viewer = useViewerRole();
  const supervisor = role === 'supervisor';
  const secretary = role === 'secretary';
  const roleKey = `dashboard.${role}`;
  const cards = schoolDashboardCards(viewer);
  const kpiCount = secretary ? 5 + Number(viewer.can('read:students')) : 6;
  const kpiColumns = secretary
    ? ({ 1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6' } as Record<number, string>)[kpiCount]
    : 'md:grid-cols-3 xl:grid-cols-6';
  const actionCount = secretary ? secretaryQuickActions(viewer).length : supervisor ? 6 : 5;
  const students = (
    <SkeletonCard title={t('dashboard.students.title')} icon={Users} className="min-h-[23rem] xl:min-h-0">
      <NSkeletonDonut />
    </SkeletonCard>
  );

  return (
    <div aria-busy="true" aria-label={t('common.loading')} className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader icon={FEATURE_ICONS.dashboard} title={t(`${roleKey}.title`)} subtitle={t(`${roleKey}.subtitle`)}>
        <NPageHeaderActions>
          <NSkeleton className="h-8 w-64 max-sm:hidden" />
        </NPageHeaderActions>
      </NPageHeader>

      <NajmScroll axis="y" className="min-h-0 flex-1">
        <div className="flex min-h-full flex-col gap-3 pb-1 xl:fit:h-full">
          <div className={cn('grid shrink-0 grid-cols-2 gap-2 lg:gap-3', kpiColumns)}>
            {Array.from({ length: kpiCount }, (_, index) => <NStatCardSkeleton key={index} />)}
          </div>

          <DashboardOverviewRow>
            <SkeletonCard title={t('dashboard.teacher.info.title')} icon={UserRound}>
              <div className="flex flex-col items-center gap-3" aria-hidden="true">
                <NSkeleton className="size-24 rounded-full" />
                <NSkeleton className="h-4 w-1/2" />
                <NSkeleton className="h-3 w-1/3" />
                <div className="mt-2 flex gap-4">
                  {Array.from({ length: 4 }, (_, index) => <NSkeleton key={index} className="size-11 rounded-full" />)}
                </div>
              </div>
            </SkeletonCard>
            {supervisor ? students : secretary ? (cards.studentsByGender && students) : (
              <SkeletonCard title={t('dashboard.floorManager.registers.title')} icon={ClipboardCheck}>
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }, (_, index) => <NSkeleton key={index} className="h-14 w-full rounded-lg" />)}
                </div>
              </SkeletonCard>
            )}
            {(!secretary || cards.studentAttendance) && (
              <SkeletonCard title={t('dashboard.attendance.studentsTitle')} icon={ClipboardCheck} className="min-h-[20rem] xl:min-h-0">
                <NSkeletonChart />
              </SkeletonCard>
            )}
            {supervisor || secretary ? (
              <SkeletonCard title={t('dashboard.attendance.staffTitle')} icon={UserCheck} className="min-h-[20rem] xl:min-h-0">
                <NSkeletonChart />
              </SkeletonCard>
            ) : students}
          </DashboardOverviewRow>

          <DashboardOverviewRow>
            {secretary && (
              <SkeletonCard title={t('dashboard.supervisor.incidentsTrend.title')} icon={ShieldAlert} className="min-h-[20rem] xl:min-h-0">
                <NSkeletonChart />
              </SkeletonCard>
            )}
            {secretary ? (
              <SkeletonCard title={t('dashboard.secretary.dailyWork.title')} icon={ClipboardList}>
                <NSkeletonEventList />
              </SkeletonCard>
            ) : supervisor ? (
              <SkeletonCard title={t('dashboard.supervisor.incidentsTrend.title')} icon={ShieldAlert} className="min-h-[20rem] xl:min-h-0">
                <NSkeletonChart />
              </SkeletonCard>
            ) : (
              <SkeletonCard title={t('dashboard.teacher.schedule.title')} icon={CalendarDays} className="h-80 min-h-0 max-h-[60dvh] overflow-hidden xl:h-full xl:max-h-none">
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, index) => <NSkeleton key={index} className="h-16 rounded-lg" />)}
                </div>
              </SkeletonCard>
            )}
            {!secretary && (
              <SkeletonCard title={t('dashboard.teacher.attention.title')} icon={AlertCircle}>
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 4 }, (_, index) => <NSkeleton key={index} className="h-6 w-full rounded-md" />)}
                </div>
              </SkeletonCard>
            )}
            <SkeletonCard title={t('dashboard.teacher.quickActions.title')} icon={Zap}>
              <div className="flex flex-col gap-1">
                {Array.from({ length: actionCount }, (_, index) => <NSkeleton key={index} className="h-11 w-full rounded-lg" />)}
              </div>
            </SkeletonCard>
            <SkeletonCard title={t('dashboard.calendar.title')} icon={CalendarDays} className="min-h-[23rem] xl:min-h-0">
              <NSkeletonCalendar />
            </SkeletonCard>
          </DashboardOverviewRow>
        </div>
      </NajmScroll>
    </div>
  );
}

function RegistrarDashboardSkeleton() {
  const { t } = useTranslation();
  const viewer = useViewerRole();
  const showsGrades = viewer.can('read:grades');

  return (
    <div aria-busy="true" aria-label={t('common.loading')} className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader icon={FEATURE_ICONS.dashboard} title={t('dashboard.registrar.title')} subtitle={t('dashboard.registrar.subtitle')}>
        <NPageHeaderActions>
          <NSkeleton className="h-8 w-64 max-sm:hidden" />
        </NPageHeaderActions>
      </NPageHeader>

      <NajmScroll axis="y" className="min-h-0 flex-1">
        <div className="flex min-h-full flex-col gap-3 pb-1 xl:fit:h-full">
          {showsGrades && (
            <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3 lg:gap-3 xl:grid-cols-6">
              {Array.from({ length: 6 }, (_, index) => <NStatCardSkeleton key={index} />)}
            </div>
          )}

          <DashboardOverviewRow>
            <SkeletonCard title={t('dashboard.teacher.info.title')} icon={UserRound}>
              <div className="flex flex-col items-center gap-3" aria-hidden="true">
                <NSkeleton className="size-24 rounded-full" />
                <NSkeleton className="h-4 w-1/2" />
                <NSkeleton className="h-3 w-1/3" />
              </div>
            </SkeletonCard>
            <SkeletonCard title={t('dashboard.attendance.studentsTitle')} icon={ClipboardCheck} className="min-h-[20rem] xl:min-h-0">
              <NSkeletonChart />
            </SkeletonCard>
            {showsGrades && (
              <SkeletonCard title={t('dashboard.registrar.distribution.title')} className="min-h-[20rem] xl:min-h-0">
                <NSkeletonChart />
              </SkeletonCard>
            )}
            {showsGrades && (
              <SkeletonCard title={t('dashboard.registrar.trend.title')} className="min-h-[20rem] xl:min-h-0">
                <NSkeletonChart />
              </SkeletonCard>
            )}
          </DashboardOverviewRow>

          <DashboardOverviewRow>
            {showsGrades && (
              <SkeletonCard title={t('dashboard.registrar.byClass.title')} className="min-h-[20rem] xl:min-h-0">
                <NSkeletonEventList />
              </SkeletonCard>
            )}
            {showsGrades && (
              <SkeletonCard title={t('dashboard.registrar.bySubject.title')} className="min-h-[20rem] xl:min-h-0">
                <NSkeletonEventList />
              </SkeletonCard>
            )}
            <SkeletonCard title={t('dashboard.teacher.quickActions.title')} icon={Zap}>
              <div className="flex flex-col gap-1">
                {registrarQuickActions(viewer).map(({ key }) => <NSkeleton key={key} className="h-11 w-full rounded-lg" />)}
              </div>
            </SkeletonCard>
            <SkeletonCard title={t('dashboard.calendar.title')} icon={CalendarDays} className="min-h-[23rem] xl:min-h-0">
              <NSkeletonCalendar />
            </SkeletonCard>
          </DashboardOverviewRow>
        </div>
      </NajmScroll>
    </div>
  );
}

// Keep this fallback free of chart imports and data queries: it is visible
// before hydration and while the desktop-only dashboard bundle downloads.
export default function DashboardSkeleton() {
  const { user } = useAuth();
  const { t } = useTranslation();
  // Role dashboards have summary figures and cards for everyday work.
  const isSecretary = usesSecretaryDashboard(user?.role);
  const isTeacher = usesTeacherDashboard(user?.role);
  const isSupervisor = usesSupervisorDashboard(user?.role);
  const showFinance = canReadFinanceDashboard(user?.role);

  if (usesRegistrarDashboard(user?.role)) return <RegistrarDashboardSkeleton />;

  if (isSecretary || isSupervisor || usesFloorManagerDashboard(user?.role)) {
    return <StaffDashboardSkeleton role={isSecretary ? 'secretary' : isSupervisor ? 'supervisor' : 'floorManager'} />;
  }

  return (
    <div aria-busy="true" aria-label={t('common.loading')} className="flex h-full min-h-0 w-full flex-col gap-2 overflow-y-auto">
      <div className="flex shrink-0 items-center justify-between gap-3 py-2">
        <NSkeleton className="h-9 w-52" />
        <NSkeleton className="h-10 w-64 max-sm:hidden" />
      </div>

      {(isTeacher || showFinance) && (
        <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => <NStatCardSkeleton key={index} />)}
        </div>
      )}

      {isTeacher ? (
        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-3 lg:grid-rows-2 [&>*]:min-h-64">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonCard key={index}><NSkeletonEventList /></SkeletonCard>
          ))}
        </div>
      ) : (
        <>
          <div className="grid min-h-64 flex-1 grid-cols-12 gap-3 [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden">
            <SkeletonCard className={showFinance ? 'col-span-2' : 'col-span-4'}><NSkeletonDonut /></SkeletonCard>
            <SkeletonCard className={showFinance ? 'col-span-4' : 'col-span-8'}><NSkeletonChart /></SkeletonCard>
            {showFinance && <SkeletonCard className="col-span-6"><NSkeletonChart /></SkeletonCard>}
          </div>
          <div className="grid min-h-64 flex-1 grid-cols-12 gap-3 [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden">
            {showFinance && <SkeletonCard className="col-span-2"><NSkeletonChart /></SkeletonCard>}
            <SkeletonCard className={showFinance ? 'col-span-4' : 'col-span-8'}><NSkeletonChart /></SkeletonCard>
            {showFinance && <SkeletonCard className="col-span-4"><NSkeletonEventList /></SkeletonCard>}
            <SkeletonCard className={showFinance ? 'col-span-2' : 'col-span-4'}><NSkeletonCalendar /></SkeletonCard>
          </div>
        </>
      )}
    </div>
  );
}
