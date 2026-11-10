'use client';

import { CalendarDays } from 'lucide-react';
import { NajmScroll, NButton, NErrorState, NForbiddenState, NPageHeaderActions } from 'najm-kit';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { isAuthorizationError } from '@/services/apiError';
import { accountAvatar } from '@/features/Home/config/accountAvatar';
import { useBusinessDate } from '@/features/Settings/hooks/useSettings';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useSecretaryOverview } from '../../hooks/useSecretaryDashboard';
import { useOwnJobTitle } from '../../hooks/useOwnJobTitle';
import { secretaryQuickActions } from '../../config/secretaryDashboard';
import { schoolDashboardCards } from '../../config/dashboardAudience';
import DashboardOverviewRow from '../DashboardOverviewRow';
import TeacherInfoCard from '../Teacher/TeacherInfoCard';
import QuickActionsCard from '../Teacher/QuickActionsCard';
import CalendarCard from '../CalendarCard';
import StudentsGenderChart from '../StudentsGenderChart';
import StudentAttendanceChart from '../StudentAttendanceChart';
import TeachersAttendance from '../TeachersAttendance';
import SecretaryKpis from './SecretaryKpis';
import DailyWorkCard from './DailyWorkCard';
import IncidentsTrendChart from '../Supervisor/IncidentsTrendChart';

export default function SecretaryDashboard() {
  const { t } = useTranslation();
  const viewer = useViewerRole();
  const { data: overview, isLoading, error, refetch } = useSecretaryOverview();
  const jobTitle = useOwnJobTitle(t('staff.roles.secretary'));
  const { businessDate, isBusinessDateLoading } = useBusinessDate();
  const { displayDate } = useSchoolFormat();
  const loadError = overview ? null : error;
  const cards = schoolDashboardCards(viewer);
  const firstName = overview?.secretary?.name?.split(' ')[0] || overview?.secretary?.name;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={FEATURE_ICONS.dashboard}
        title={firstName ? t('dashboard.teacher.welcomeBack', { name: firstName }) : t('dashboard.secretary.title')}
        subtitle={t('dashboard.secretary.subtitle')}
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
            : <NErrorState surface="panel" className="min-h-80" title={t('common.feedback.errorTitle')} onRetry={() => { void refetch(); }} />
        ) : (
          <div className="flex min-h-full flex-col gap-3 pb-1 xl:fit:h-full">
            <SecretaryKpis overview={overview} loading={isLoading} />

            <DashboardOverviewRow>
              <TeacherInfoCard
                person={overview?.secretary ?? undefined}
                jobTitle={jobTitle}
                fallbackSrc={accountAvatar('secretary', overview?.secretary?.gender)}
                loading={isLoading}
                error={null}
                onRetry={() => { void refetch(); }}
              />
              {cards.studentsByGender && <StudentsGenderChart className="min-h-[23rem] xl:min-h-0" />}
              {cards.studentAttendance && <StudentAttendanceChart audience="secretary" className="min-h-[20rem] xl:min-h-0" />}
              <TeachersAttendance audience="secretary" className="min-h-[20rem] xl:min-h-0" />
            </DashboardOverviewRow>

            <DashboardOverviewRow>
              <IncidentsTrendChart
                monthly={overview?.incidentsMonthly}
                businessDate={isBusinessDateLoading ? undefined : businessDate}
                loading={isLoading || isBusinessDateLoading}
                error={null}
                onRetry={() => { void refetch(); }}
                className="min-h-[20rem] xl:min-h-0"
              />
              <DailyWorkCard overview={overview} loading={isLoading} />
              <QuickActionsCard actions={secretaryQuickActions(viewer)} dense />
              <CalendarCard dense className="min-h-[23rem] xl:min-h-0" />
            </DashboardOverviewRow>
          </div>
        )}
      </NajmScroll>
    </div>
  );
}
