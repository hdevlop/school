'use client';

import React, { useState } from 'react';
import { NajmScroll, NButton, NEmptyState, NErrorState, NForbiddenState, NPageHeader, NPageHeaderActions, NTabs } from 'najm-kit';
import { AlertTriangle, Bus, CalendarCheck, CalendarRange, DollarSign, GraduationCap, User, X } from 'lucide-react';
import { useAuth } from 'najm-auth/client/react';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { StudentProfileTabsProps } from './types';
import OverviewTab from './Overview';
import FeesTab from './Fees';
import AlertsTab from './Alerts';
import AttendanceTab from './Attendance';
import GradesTab from './Grades';
import LeftSidebar from './LeftSidebar';
import { useStudentProfile } from '@/features/Students/hooks/useStudentProfile';
import { useTranslation } from 'najm-i18n/react';
import TransportTab from './Transport';
import EnrollmentTab from './Enrollment';
import { isAuthorizationError, isNotFoundError } from '@/services/apiError';

export { default as LeftSidebar } from './LeftSidebar';
export { default as OverviewTab } from './Overview';

export default function StudentProfileTabs({ studentId, onClose, onOpenFeeRecord }: StudentProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { student, isStudentLoading, studentError, refetchStudent, parents, isParentsLoading } = useStudentProfile(studentId);
  const { t } = useTranslation();
  const { user } = useAuth();
  // The enrollment history and its commands are administrator/principal routes.
  const role = (user as { role?: string } | null)?.role;
  const canManageEnrollment = role === 'admin' || role === 'principal';
  // The fees and transport tabs read finance and transport routes.
  const { isSchoolWide, can } = useViewerRole();
  const canReadFees = isSchoolWide && can('read:fees');
  const canReadTransport = isSchoolWide && can('read:student-routes');

  const sharedTabProps = {
    studentId,
    student,
    isLoading: isStudentLoading,
    parents,
    isParentsLoading,
  };

  const tabItems = [
    { value: 'overview', icon: User, label: t('students.profile.tabs.overview'), content: <OverviewTab {...sharedTabProps} /> },
    ...(canManageEnrollment
      ? [{ value: 'enrollment', icon: CalendarRange, label: t('students.profile.tabs.schoolYears'), content: <EnrollmentTab studentId={studentId} /> }]
      : []),
    { value: 'attendance', icon: CalendarCheck, label: t('students.profile.tabs.attendance'), content: <AttendanceTab {...sharedTabProps} /> },
    { value: 'grades', icon: GraduationCap, label: t('students.profile.tabs.grades'), content: <GradesTab {...sharedTabProps} /> },
    ...(canReadFees
      ? [{ value: 'fees', icon: DollarSign, label: t('students.profile.tabs.fees'), content: <FeesTab {...sharedTabProps} onOpenFeeRecord={onOpenFeeRecord} /> }]
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
          <span className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
      ),
      content: <AlertsTab studentId={studentId} />,
    },
  ];
  const resolvedActiveTab = tabItems.some((item) => item.value === activeTab) ? activeTab : 'overview';

  return (
    <NajmScroll axis="y" className="h-full min-h-0 w-full flex-1 rounded-xl border border-slate-200 bg-white">
    <div className="flex min-h-full min-w-0 flex-col">
      <NPageHeader
        icon={GraduationCap}
        title={t('students.profile.detailsTitle')}
        subtitle={t('students.profile.detailsSubtitle')}
        className="shrink-0 border-x-0 border-t-0 border-b border-slate-200 bg-white"
      >
        <NPageHeaderActions>
          {onClose && (
            <NButton
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              aria-label={t('students.profile.closeDetails')}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </NButton>
          )}
        </NPageHeaderActions>
      </NPageHeader>

      {/* A refused or missing record is not an empty student: without this the
          tabs draw "Unknown", no absences and a zero balance. */}
      {studentError && !student ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          {isAuthorizationError(studentError)
            ? <NForbiddenState surface="panel" />
            : isNotFoundError(studentError)
              ? <NEmptyState surface="panel" icon={GraduationCap} title={t('students.errors.notFound')} />
              : <NErrorState surface="panel" onRetry={() => refetchStudent()} />}
        </div>
      ) : (
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 w-full shrink-0 border-b border-slate-200 lg:w-72 xl:w-80 2xl:w-96 lg:border-b-0 lg:border-r">
          <LeftSidebar
            student={student}
            isLoading={isStudentLoading}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <NTabs
            items={tabItems.map((item) => ({
              ...item,
              label: <span className="max-sm:min-w-0 max-sm:truncate max-sm:group-data-[state=inactive]:sr-only">{item.label}</span>,
            }))}
            value={resolvedActiveTab}
            onValueChange={setActiveTab}
            variant="underline"
            classNames={{
              root: 'min-h-0 w-full flex-1 gap-0',
              list: 'h-auto max-w-full shrink-0 flex-wrap justify-start gap-4 !border-0 !border-b-0 !border-transparent bg-white px-5 py-0 !shadow-none max-sm:gap-0 max-sm:px-1',
              trigger:
                'group relative cursor-pointer gap-2 px-2 pb-3 pt-3 text-slate-500 hover:text-slate-700 data-[state=active]:border-b-primary! data-[state=active]:text-primary! max-sm:min-w-0 max-sm:shrink-0 max-sm:data-[state=active]:shrink',
              content: 'min-h-0 flex-1 px-5 py-3',
            }}
            styles={{
              list: {
                border: 0,
                borderBottom: 0,
                borderColor: 'transparent',
                boxShadow: 'none',
              },
            }}
          />
        </div>
      </div>
      )}
    </div>
    </NajmScroll>
  );
}
