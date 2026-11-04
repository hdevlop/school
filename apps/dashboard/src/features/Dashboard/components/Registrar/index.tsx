'use client';

import { useMemo } from 'react';
import { BookOpen, CalendarDays, Layers3 } from 'lucide-react';
import { NajmScroll, NButton, NErrorState, NForbiddenState, NPageHeader, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { isAuthorizationError } from '@/services/apiError';
import { accountAvatar } from '@/features/Home/config/accountAvatar';
import { useBusinessDate } from '@/features/Settings/hooks/useSettings';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useRegistrarOverview } from '../../hooks/useRegistrarDashboard';
import { useOwnJobTitle } from '../../hooks/useOwnJobTitle';
import { classesInSchoolOrder, registrarQuickActions, subjectsByAverage } from '../../config/registrarDashboard';
import DashboardOverviewRow from '../DashboardOverviewRow';
import TeacherInfoCard from '../Teacher/TeacherInfoCard';
import QuickActionsCard from '../Teacher/QuickActionsCard';
import CalendarCard from '../CalendarCard';
import StudentAttendanceChart from '../StudentAttendanceChart';
import RegistrarKpis from './RegistrarKpis';
import GradeDistributionChart from './GradeDistributionChart';
import GradeTrendChart from './GradeTrendChart';
import GradeAveragesCard from './GradeAveragesCard';

/** The signed-in registrar's home page: the state of the year's grades, and attendance. */
export default function RegistrarDashboard() {
  const { t } = useTranslation();
  const viewer = useViewerRole();
  const { data: overview, isLoading, error, refetch } = useRegistrarOverview();
  const jobTitle = useOwnJobTitle(t('staff.roles.registrar'));
  const { businessDate, isBusinessDateLoading } = useBusinessDate();
  const { displayDate } = useSchoolFormat();
  // A background refresh that fails keeps the figures already on screen.
  const loadError = overview ? null : error;
  const retry = () => { void refetch(); };
  const cardState = { loading: isLoading, error: null, onRetry: retry };
  const firstName = overview?.registrar?.name?.split(' ')[0] || overview?.registrar?.name;
  // While loading, every card shows its skeleton; once loaded, a registrar
  // without read:grades loses these cards rather than seeing them at zero.
  const grades = overview?.grades;
  const showsGrades = isLoading || !!grades;
  const byClass = useMemo(() => grades && classesInSchoolOrder(grades.byClass), [grades]);
  const bySubject = useMemo(() => grades && subjectsByAverage(grades.bySubject), [grades]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={FEATURE_ICONS.dashboard}
        title={firstName ? t('dashboard.teacher.welcomeBack', { name: firstName }) : t('dashboard.registrar.title')}
        subtitle={t('dashboard.registrar.subtitle')}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
          {overview && !isBusinessDateLoading && (
            <NButton type="button" variant="outline" size="sm" className="gap-2 max-md:hidden">
              <CalendarDays className="size-4" />
              {displayDate(businessDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </NButton>
          )}
        </NPageHeaderActions>
      </NPageHeader>
      <NajmScroll axis="y" className="min-h-0 flex-1">
        {loadError ? (
          isAuthorizationError(loadError)
            ? <NForbiddenState surface="panel" className="min-h-80" />
            : <NErrorState surface="panel" className="min-h-80" title={t('common.feedback.errorTitle')} onRetry={retry} />
        ) : (
          <div className="flex min-h-full flex-col gap-3 pb-1 xl:fit:h-full">
            {showsGrades && <RegistrarKpis grades={grades} loading={isLoading} />}

            <DashboardOverviewRow>
              <TeacherInfoCard
                person={overview?.registrar ?? undefined}
                jobTitle={jobTitle}
                // There is no registrar portrait; the secretary's suits an office role.
                fallbackSrc={accountAvatar('secretary', overview?.registrar?.gender)}
                {...cardState}
              />
              <StudentAttendanceChart audience="registrar" className="min-h-[20rem] xl:min-h-0" />
              {showsGrades && <GradeDistributionChart distribution={grades?.distribution} className="min-h-[20rem] xl:min-h-0" {...cardState} />}
              {showsGrades && (
                <GradeTrendChart
                  monthly={grades?.monthly}
                  businessDate={isBusinessDateLoading ? undefined : businessDate}
                  className="min-h-[20rem] xl:min-h-0"
                  {...cardState}
                  loading={isLoading || isBusinessDateLoading}
                />
              )}
            </DashboardOverviewRow>

            <DashboardOverviewRow>
              {showsGrades && (
                <GradeAveragesCard
                  title={t('dashboard.registrar.byClass.title')}
                  emptyTitle={t('dashboard.registrar.byClass.empty')}
                  icon={Layers3}
                  rows={byClass}
                  className="min-h-[20rem] xl:min-h-0"
                  {...cardState}
                />
              )}
              {showsGrades && (
                <GradeAveragesCard
                  title={t('dashboard.registrar.bySubject.title')}
                  emptyTitle={t('dashboard.registrar.bySubject.empty')}
                  icon={BookOpen}
                  rows={bySubject}
                  className="min-h-[20rem] xl:min-h-0"
                  {...cardState}
                />
              )}
              <QuickActionsCard actions={registrarQuickActions(viewer)} dense />
              <CalendarCard dense className="min-h-[23rem] xl:min-h-0" />
            </DashboardOverviewRow>
          </div>
        )}
      </NajmScroll>
    </div>
  );
}
