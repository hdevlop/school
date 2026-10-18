"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, CreditCard, LayoutDashboard, Pencil, UserRound } from 'lucide-react';
import { NButton, NEmptyState, NErrorState, NForbiddenState, NajmScroll, NLoadingState, NPageHeader, NPageHeaderActions, Tabs, TabsContent, TabsList, TabsTrigger } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { useTranslation } from 'najm-i18n/react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { getTeacherByIdApi } from '@/services/teacherApi';
import { isAuthorizationError, isNotFoundError } from '@/services/apiError';
import { useYearScopedDetail } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSubjects } from '@/features/Subjects/hooks/useSubjects';
import { useTeacherOverview } from '@/features/Dashboard/hooks/useTeacherDashboard';
import TeacherOverview, { TeacherOverviewDate } from '@/features/Dashboard/components/Teacher/TeacherOverview';
import { useTeachers } from '../../hooks/useTeachers';
import TeacherForm from '../TeacherForm';
import TeacherDetailsTab from './TeacherDetailsTab';
import TeacherTimetableTab from './TeacherTimetableTab';
import TeacherPayrollTab from './TeacherPayrollTab';

const TABS = ['overview', 'details', 'timetable', 'payroll'] as const;
type TeacherTab = (typeof TABS)[number];

const TAB_ICONS: Record<TeacherTab, typeof UserRound> = {
  overview: LayoutDashboard,
  details: UserRound,
  timetable: CalendarDays,
  payroll: CreditCard,
};

interface TeacherViewProps {
  teacherId: string;
}

/**
 * One teacher as a school-wide reader opens them from the teachers list: the
 * overview the teacher sees on sign-in, with their details, timetable and
 * payroll in tabs beside it.
 */
const TeacherView: React.FC<TeacherViewProps> = ({ teacherId }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { openDialog } = useDialog();
  const [tab, setTab] = useState<TeacherTab>('overview');

  const overviewQuery = useTeacherOverview(teacherId);
  const { data: teacher, isLoading, error, refetch } = useYearScopedDetail({
    resource: 'teachers',
    parts: ['detail', teacherId],
    fetch: () => getTeacherByIdApi(teacherId),
    enabled: !!teacherId,
  });
  const { updateTeacher } = useTeachers({ enabled: false });
  const { classes } = useClasses();
  const { subjects } = useSubjects();

  const name = overviewQuery.data?.teacher.name ?? teacher?.name;

  const handleEdit = () => {
    if (!teacher) return;
    openDialog({
      title: `${t('teachers.dialogs.editTitle')} - ${teacher.name}`,
      children: (
        <TeacherForm
          teacher={teacher}
          classes={classes}
          subjects={subjects}
          onSubmitTeacher={async (data) => {
            const result = await updateTeacher(data);
            void refetch();
            void overviewQuery.refetch();
            return result;
          }}
        />
      ),
      width: '4xl',
      height: 'xxl',
      showButtons: false,
    });
  };

  // Details and payroll read the teacher record; the overview has its own.
  // Only a failed request offers a retry: one cannot bring back a deleted
  // teacher or grant access.
  const recordState = isLoading ? (
    <NLoadingState surface="panel" label={t('common.loading')} className="min-h-80" />
  ) : !teacher && (!error || isNotFoundError(error)) ? (
    <NEmptyState surface="panel" icon={UserRound} title={t('teachers.profile.teacherNotFound')} className="min-h-80" />
  ) : !teacher && isAuthorizationError(error) ? (
    <NForbiddenState surface="panel" className="min-h-80" />
  ) : !teacher ? (
    <NErrorState surface="panel" onRetry={() => void refetch()} className="min-h-80" />
  ) : null;

  return (
    <NajmScroll axis="y" className="h-full min-h-0 w-full flex-1">
    <div className="flex min-h-full min-w-0 flex-col gap-2 fit:h-full">
      <NPageHeader
        icon={FEATURE_ICONS.teachers}
        title={name ?? t('dashboard.teacher.title')}
        subtitle={t('dashboard.teacher.profileSubtitle')}
      >
        <NPageHeaderActions className="gap-2">
          <NButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/teachers')}
            aria-label={t('dashboard.teacher.backToTeachers')}
            className="gap-2"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            <span className="max-sm:hidden">{t('dashboard.teacher.backToTeachers')}</span>
          </NButton>
          <NButton type="button" variant="outline" size="sm" onClick={handleEdit} disabled={!teacher} aria-label={t('common.edit')}>
            <Pencil className="size-4" />
          </NButton>
          <TeacherOverviewDate teacherId={teacherId} />
        </NPageHeaderActions>
      </NPageHeader>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as TeacherTab)}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-3"
      >
        <TabsList variant="underline" className="shrink-0 flex-wrap justify-start">
          {TABS.map((value) => {
            const Icon = TAB_ICONS[value];
            return (
              <TabsTrigger
                key={value}
                value={value}
                variant="underline"
                className="group min-w-0 gap-2 max-sm:shrink-0 max-sm:data-[state=active]:shrink data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="truncate max-sm:group-data-[state=inactive]:sr-only">{t(`dashboard.teacher.tabs.${value}`)}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

          <TabsContent value="overview" className="mt-0 fit:min-h-0">
            <TeacherOverview teacherId={teacherId} onViewDetails={() => setTab('details')} />
          </TabsContent>
          <TabsContent value="details" className="mt-0">
            {recordState ?? (
              <TeacherDetailsTab
                teacher={teacher}
                classes={overviewQuery.data?.classes}
                classesLoading={overviewQuery.isLoading}
                classesError={overviewQuery.data ? null : overviewQuery.error}
              />
            )}
          </TabsContent>
          <TabsContent value="timetable" className="mt-0">
            <TeacherTimetableTab teacherId={teacherId} />
          </TabsContent>
          <TabsContent value="payroll" className="mt-0">
            {recordState ?? <TeacherPayrollTab teacher={teacher} today={overviewQuery.data?.date} />}
          </TabsContent>
      </Tabs>
    </div>
    </NajmScroll>
  );
};

export default TeacherView;
