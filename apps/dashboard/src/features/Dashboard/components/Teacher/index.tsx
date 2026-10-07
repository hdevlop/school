'use client';

import { NajmScroll, NPageHeader, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useTeacherOverview } from '../../hooks/useTeacherDashboard';
import TeacherOverview, { TeacherOverviewDate } from './TeacherOverview';

/**
 * The signed-in teacher's home page. A school-wide reader opens the same
 * overview for any teacher from the teachers list, with the teacher's
 * details, timetable and payroll beside it (`features/Teachers`, TeacherView).
 */
const TeacherDashboard = () => {
  const { t } = useTranslation();
  const { data: overview } = useTeacherOverview();
  const firstName = overview?.teacher.name?.split(' ')[0] || overview?.teacher.name;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={FEATURE_ICONS.teachers}
        title={firstName ? t('dashboard.teacher.welcomeBack', { name: firstName }) : t('dashboard.teacher.title')}
        subtitle={t('dashboard.teacher.subtitle')}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
          <TeacherOverviewDate />
        </NPageHeaderActions>
      </NPageHeader>

      <NajmScroll axis="y" className="min-h-0 flex-1">
        <TeacherOverview />
      </NajmScroll>
    </div>
  );
};

export default TeacherDashboard;
