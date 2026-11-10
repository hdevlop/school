'use client';

import { NajmScroll, NPageHeaderActions } from 'najm-kit';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useMonitorOverview } from '../../hooks/useMonitorDashboard';
import MonitorOverview, { MonitorOverviewDate } from './MonitorOverview';

/** The signed-in monitor's home page, laid out like the teacher's. */
const MonitorDashboard = () => {
  const { t } = useTranslation();
  const { data: overview } = useMonitorOverview();
  const firstName = overview?.manager.name?.split(' ')[0] || overview?.manager.name;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={FEATURE_ICONS.dashboard}
        title={firstName ? t('dashboard.teacher.welcomeBack', { name: firstName }) : t('dashboard.monitor.title')}
        subtitle={t('dashboard.monitor.subtitle')}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
          <MonitorOverviewDate />
        </NPageHeaderActions>
      </NPageHeader>

      <NajmScroll axis="y" className="min-h-0 flex-1">
        <MonitorOverview />
      </NajmScroll>
    </div>
  );
};

export default MonitorDashboard;
