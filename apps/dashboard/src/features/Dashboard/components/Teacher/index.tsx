'use client';

import { LayoutDashboard } from 'lucide-react';
import { NPageHeader, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTeacherOverview } from '../../hooks/useTeacherDashboard';
import TeacherKpis from './TeacherKpis';
import NextClassCard from './NextClassCard';
import TodayScheduleCard from './TodayScheduleCard';
import NeedsAttentionCard from './NeedsAttentionCard';
import MyClassesCard from './MyClassesCard';
import AssessmentsCard from './AssessmentsCard';
import AttendanceTrendCard from './AttendanceTrendCard';

const TeacherDashboard = () => {
  const { t } = useTranslation();
  const { displayDate } = useSchoolFormat();
  const { data: overview, isLoading, error, refetch } = useTeacherOverview();
  // A background refresh that fails keeps the figures already on screen.
  const loadError = overview ? null : error;
  const retry = () => { void refetch(); };
  const cardState = { loading: isLoading, error: loadError, onRetry: retry };

  return (
    <div className="flex w-full flex-col gap-3">
      <NPageHeader
        icon={LayoutDashboard}
        title={t('dashboard.teacher.title')}
        subtitle={overview
          ? displayDate(overview.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          : undefined}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <TeacherKpis kpis={overview?.kpis} loading={isLoading} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <NextClassCard session={overview?.nextSession} {...cardState} />
        <TodayScheduleCard
          sessions={overview?.todaySessions}
          nextEntryId={overview?.nextSession?.entryId}
          {...cardState}
        />
        <NeedsAttentionCard attention={overview?.attention} {...cardState} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <MyClassesCard classes={overview?.classes} {...cardState} />
        <AssessmentsCard assessments={overview?.assessments} {...cardState} />
        <AttendanceTrendCard />
      </div>
    </div>
  );
};

export default TeacherDashboard;
