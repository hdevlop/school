'use client';

import { NajmScroll, NErrorState, NForbiddenState, NPageHeader, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { isAuthorizationError } from '@/services/apiError';
import { useSecretaryOverview } from '../../hooks/useSecretaryDashboard';
import { secretaryQuickActions } from '../../config/secretaryDashboard';
import { rowSpans, schoolDashboardCards } from '../../config/dashboardAudience';
import QuickActionsCard from '../Teacher/QuickActionsCard';
import CalendarCard from '../CalendarCard';
import StudentsGenderChart from '../StudentsGenderChart';
import StudentAttendanceChart from '../StudentAttendanceChart';
import TeachersAttendance from '../TeachersAttendance';
import SecretaryKpis from './SecretaryKpis';
import DailyWorkCard from './DailyWorkCard';

export default function SecretaryDashboard() {
  const { t } = useTranslation();
  const viewer = useViewerRole();
  const { data: overview, isLoading, error, refetch } = useSecretaryOverview();
  const loadError = overview ? null : error;
  const cards = schoolDashboardCards(viewer);
  const spans = rowSpans({ gender: cards.studentsByGender && 3, attendance: cards.studentAttendance && 6, staff: cards.staffAttendance && 3 });

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader icon={FEATURE_ICONS.dashboard} title={t('dashboard.secretary.title')} subtitle={t('dashboard.secretary.subtitle')}>
        <NPageHeaderActions><PageHeaderGlobalActions /></NPageHeaderActions>
      </NPageHeader>
      <NajmScroll axis="y" className="min-h-0 flex-1">
        {loadError ? (
          isAuthorizationError(loadError)
            ? <NForbiddenState surface="panel" className="min-h-80" />
            : <NErrorState surface="panel" className="min-h-80" title={t('common.feedback.errorTitle')} onRetry={() => { void refetch(); }} />
        ) : (
          <div className="flex min-h-full flex-col gap-3 pb-1">
            <SecretaryKpis overview={overview} loading={isLoading} />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 [&>*]:min-w-0">
              <DailyWorkCard overview={overview} loading={isLoading} />
              <QuickActionsCard actions={secretaryQuickActions(viewer)} />
              <CalendarCard className="min-h-[23rem]" />
            </div>
            {(spans.gender || spans.attendance || spans.staff) && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12 [&>*]:h-80 [&>*]:min-w-0">
                {spans.gender && <StudentsGenderChart className={spans.gender} />}
                {spans.attendance && <StudentAttendanceChart className={spans.attendance} />}
                {spans.staff && <TeachersAttendance className={spans.staff} />}
              </div>
            )}
          </div>
        )}
      </NajmScroll>
    </div>
  );
}
