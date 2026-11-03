'use client';

import { NajmScroll, NPageHeader, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useSupervisorOverview } from '../../hooks/useSupervisorDashboard';
import SupervisorOverview, { SupervisorOverviewDate } from './SupervisorOverview';

/** The signed-in supervisor's home page. */
const SupervisorDashboard = () => {
  const { t } = useTranslation();
  const { data: overview } = useSupervisorOverview();
  const firstName = overview?.supervisor.name?.split(' ')[0] || overview?.supervisor.name;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={FEATURE_ICONS.dashboard}
        title={firstName ? t('dashboard.teacher.welcomeBack', { name: firstName }) : t('dashboard.supervisor.title')}
        subtitle={t('dashboard.supervisor.subtitle')}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
          <SupervisorOverviewDate />
        </NPageHeaderActions>
      </NPageHeader>

      <NajmScroll axis="y" className="min-h-0 flex-1">
        <SupervisorOverview />
      </NajmScroll>
    </div>
  );
};

export default SupervisorDashboard;
