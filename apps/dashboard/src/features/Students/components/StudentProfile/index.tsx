'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NajmScroll, NButton, NEmptyState, NErrorState, NForbiddenState, NLoadingState, NPageHeader, NPageHeaderActions, Tabs, TabsContent, TabsList, TabsTrigger } from 'najm-kit';
import { AlertTriangle, ArrowLeft, Bus, CalendarCheck, DollarSign, GraduationCap, Pencil, User } from 'lucide-react';
import { useAuth } from 'najm-auth/client/react';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { StudentProfileProps } from './types';
import OverviewTab from './Overview';
import FeesTab from './Fees';
import AlertsTab from './Alerts';
import AttendanceTab from './Attendance';
import GradesTab from './Grades';
import LeftSidebar from './LeftSidebar';
import { useStudentProfile } from '@/features/Students/hooks/useStudentProfile';
import { useTranslation } from 'najm-i18n/react';
import TransportTab from './Transport';
import EnrollmentActions from './Enrollment';
import { isAuthorizationError, isNotFoundError } from '@/services/apiError';
import { useAlerts } from '@/features/Alerts/hooks/useAlerts';
import { useDialog } from '@/shared/useDialog';
import { useStudents } from '@/features/Students/hooks/useStudents';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useStudentAttendanceRecords } from '@/features/Attendance/hooks/useAttendance';
import { useStudentReport } from '@/features/Grades/hooks/useGrades';
import { useFees } from '@/features/Financial/Fees/hooks/useFees';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import SimpleStudentForm from '../SimpleStudentForm';

export { default as LeftSidebar } from './LeftSidebar';
export { default as OverviewTab } from './Overview';

export default function StudentProfile({ studentId }: StudentProfileProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { student, isStudentLoading, studentError, refetchStudent, parents, isParentsLoading } = useStudentProfile(studentId);
  const { t } = useTranslation();
  const { user } = useAuth();
  // Placement commands remain administrator/principal routes.
  const role = (user as { role?: string } | null)?.role;
  const canManageEnrollment = role === 'admin' || role === 'principal';
  // The fees and transport tabs read finance and transport routes.
  const { isSchoolWide, isFamily, can } = useViewerRole();
  const canEdit = !isFamily && can('update:students');
  const { openDialog } = useDialog();
  const { updateStudent, isUpdating } = useStudents({ enabled: false });
  const { classes } = useClasses({ enabled: canEdit });
  const { viewingYear } = useViewingAcademicYear();
  // The sidebar mounts only once the student has loaded. Its reads start here,
  // beside the student's, and reach it as props: they arrive with the record
  // instead of one round trip after it, and its mount refetches nothing.
  const { data: attendanceResponse } = useStudentAttendanceRecords(studentId);
  const { data: reportResponse } = useStudentReport(studentId || null);
  const { studentFees } = useFees({ studentId, studentYear: viewingYear, enabled: false });
  const canReadFees = isSchoolWide && can('read:fees');
  const canReadTransport = isSchoolWide && can('read:student-routes');
  const { alerts } = useAlerts({ studentId, enabled: Boolean(studentId) && can('read:alerts') });
  const hasActiveAlerts = (alerts ?? []).some((alert) => alert.status === 'active');

  const handleEdit = () => {
    if (!student || !canEdit) return;
    openDialog({
      title: `${t('students.dialogs.editTitle')} - ${student.name}`,
      children: <SimpleStudentForm student={student} classes={classes} />,
      width: '4xl',
      height: 'full',
      primaryButton: {
        form: 'student-form',
        text: t('students.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (data) => {
          await withAcademicYear(viewingYear, () => updateStudent(data));
        },
      },
    });
  };

  const sharedTabProps = {
    studentId,
    student,
    isLoading: isStudentLoading,
    parents,
    isParentsLoading,
  };

  const tabItems = [
    { value: 'overview', icon: User, label: t('students.profile.tabs.overview'), content: (
      <div className="grid min-w-0 gap-3 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="self-start overflow-hidden rounded-xl border border-border">
          <LeftSidebar
            student={student}
            isLoading={isStudentLoading}
            attendanceResponse={attendanceResponse}
            reportResponse={reportResponse}
            studentFees={studentFees}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <OverviewTab {...sharedTabProps} />
        </div>
      </div>
    ) },
    { value: 'attendance', icon: CalendarCheck, label: t('students.profile.tabs.attendance'), content: <AttendanceTab {...sharedTabProps} /> },
    { value: 'grades', icon: GraduationCap, label: t('students.profile.tabs.grades'), content: <GradesTab {...sharedTabProps} /> },
    ...(canReadFees
      ? [{ value: 'fees', icon: DollarSign, label: t('students.profile.tabs.fees'), content: <FeesTab {...sharedTabProps} /> }]
      : []),
    ...(canReadTransport
      ? [{ value: 'transport', icon: Bus, label: t('students.profile.tabs.transport'), content: <TransportTab {...sharedTabProps} /> }]
      : []),
    {
      value: 'alerts',
      icon: AlertTriangle,
      label: (
        <span className="relative">
          {t('students.profile.tabs.alerts')}
          {hasActiveAlerts && <span className="absolute -end-2 -top-1 h-1.5 w-1.5 rounded-full bg-red-500" />}
        </span>
      ),
      content: <AlertsTab studentId={studentId} />,
    },
  ];
  const resolvedActiveTab = tabItems.some((item) => item.value === activeTab) ? activeTab : 'overview';

  return (
    <NajmScroll axis="y" className="h-full min-h-0 w-full flex-1">
    <div className="flex min-h-full min-w-0 flex-col gap-2 fit:h-full">
      <NPageHeader
        icon={GraduationCap}
        title={student?.name ?? t('students.profile.detailsTitle')}
        subtitle={t('students.profile.detailsSubtitle')}
      >
        <NPageHeaderActions>
          {student && !isStudentLoading && (
            <>
              {canManageEnrollment && <EnrollmentActions studentId={studentId} showHistory={false} />}
              {canEdit && (
                <NButton type="button" variant="outline" size="sm" className="gap-2" onClick={handleEdit}>
                  <Pencil className="size-4" aria-hidden="true" />
                  {t('common.edit')}
                </NButton>
              )}
            </>
          )}
          <NButton
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            aria-label={t('students.profile.backToStudents')}
            onClick={() => router.push('/students')}
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            <span className="max-sm:hidden">{t('students.profile.backToStudents')}</span>
          </NButton>
        </NPageHeaderActions>
      </NPageHeader>

      {/* A refused or missing record is not an empty student: without this the
          tabs draw "Unknown", no absences and a zero balance. */}
      {isStudentLoading ? (
        <NLoadingState surface="panel" label={t('common.loading')} className="min-h-80" />
      ) : !student ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          {isAuthorizationError(studentError)
            ? <NForbiddenState surface="panel" />
            : !studentError || isNotFoundError(studentError)
              ? <NEmptyState surface="panel" icon={GraduationCap} title={t('students.errors.notFound')} />
              : <NErrorState surface="panel" onRetry={() => refetchStudent()} />}
        </div>
      ) : (
        <Tabs
          value={resolvedActiveTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-3"
        >
          <TabsList variant="underline" className="w-fit max-w-full shrink-0 self-start flex-wrap justify-start">
            {tabItems.map(({ value, icon: Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                variant="underline"
                className="group min-w-0 gap-2 max-sm:shrink-0 max-sm:data-[state=active]:shrink data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="truncate max-sm:group-data-[state=inactive]:sr-only">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {tabItems.map(({ value, content }) => (
            <TabsContent key={value} value={value} className="mt-0 min-w-0">
              {content}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
    </NajmScroll>
  );
}
