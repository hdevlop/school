'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NajmScroll, NButton, NEmptyState, NErrorState, NForbiddenState, NLoadingState, NPageHeader, NPageHeaderActions, Tabs, TabsContent, TabsList, TabsTrigger } from 'najm-kit';
import { AlertTriangle, ArrowLeft, Bus, CalendarCheck, DollarSign, GraduationCap, User } from 'lucide-react';
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
  const { isSchoolWide, can } = useViewerRole();
  const canReadFees = isSchoolWide && can('read:fees');
  const canReadTransport = isSchoolWide && can('read:student-routes');
  const { alerts } = useAlerts({ studentId, enabled: Boolean(studentId) && can('read:alerts') });
  const hasActiveAlerts = (alerts ?? []).some((alert) => alert.status === 'active');

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
          <LeftSidebar student={student} isLoading={isStudentLoading} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {canManageEnrollment && <EnrollmentActions studentId={studentId} showHistory={false} />}
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
          <TabsList variant="underline" className="shrink-0 flex-wrap justify-start">
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
