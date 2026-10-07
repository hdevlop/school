'use client';

import { CalendarDays } from 'lucide-react';
import { NButton } from 'najm-kit';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTeacherOverview } from '../../hooks/useTeacherDashboard';
import TeacherKpis from './TeacherKpis';
import TeacherInfoCard from './TeacherInfoCard';
import TodayScheduleCard from './TodayScheduleCard';
import NeedsAttentionCard from './NeedsAttentionCard';
import MyClassesCard from './MyClassesCard';
import AssessmentsCard from './AssessmentsCard';
import QuickActionsCard from './QuickActionsCard';

type TeacherOverviewProps = {
  // Without one, the signed-in teacher's own day.
  teacherId?: string;
  onViewDetails?: () => void;
};

// A row of three cards that takes its share of the height on a screen the
// overview fits (the `fit` variant in globals.css).
const ROW = 'grid grid-cols-1 gap-3 lg:grid-cols-3 fit:min-h-[17rem] fit:flex-1 fit:basis-0 [&>*]:min-w-0 fit:[&>*]:min-h-0';

/** The school's business date the overview describes, for a page header. */
export const TeacherOverviewDate = ({ teacherId }: { teacherId?: string }) => {
  const { displayDate } = useSchoolFormat();
  const { data: overview } = useTeacherOverview(teacherId);
  if (!overview) return null;
  return (
    // Phones keep the header to its actions; the date is shown from md up.
    <NButton type="button" variant="outline" size="sm" className="gap-2 max-md:hidden">
      <CalendarDays className="size-4" />
      {displayDate(overview.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </NButton>
  );
};

const TeacherOverview = ({ teacherId, onViewDetails }: TeacherOverviewProps) => {
  const { data: overview, isLoading, error, refetch } = useTeacherOverview(teacherId);
  // A background refresh that fails keeps the figures already on screen.
  const loadError = overview ? null : error;
  const retry = () => { void refetch(); };
  const cardState = { loading: isLoading, error: loadError, onRetry: retry };

  return (
    <div className="flex min-h-full flex-col gap-3 pb-1 fit:h-full">
      <TeacherKpis kpis={overview?.kpis} classes={overview?.classes} loading={isLoading} />

      {/* The two rows share the height left under the figures, with long
          lists in NajmScroll. Shorter screens scroll the page. */}
      <div className={ROW}>
        <TeacherInfoCard overview={overview} onViewDetails={onViewDetails} {...cardState} />
        <TodayScheduleCard
          sessions={overview?.todaySessions}
          nextSession={overview?.nextSession}
          {...cardState}
        />
        <NeedsAttentionCard attention={overview?.attention} {...cardState} />
      </div>

      <div className={ROW}>
        <MyClassesCard classes={overview?.classes} {...cardState} />
        <AssessmentsCard assessments={overview?.assessments} {...cardState} />
        <QuickActionsCard />
      </div>
    </div>
  );
};

export default TeacherOverview;
