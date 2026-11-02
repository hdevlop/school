'use client';

import { NajmScroll, NPageHeader, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useFloorManagerOverview } from '../../hooks/useFloorManagerDashboard';
import FloorManagerOverview, { FloorManagerOverviewDate } from './FloorManagerOverview';

/** The signed-in floor manager's home page, laid out like the teacher's. */
const FloorManagerDashboard = () => {
  const { t } = useTranslation();
  const { data: overview } = useFloorManagerOverview();
  const firstName = overview?.manager.name?.split(' ')[0] || overview?.manager.name;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader
        icon={FEATURE_ICONS.dashboard}
        title={firstName ? t('dashboard.teacher.welcomeBack', { name: firstName }) : t('dashboard.floorManager.title')}
        subtitle={t('dashboard.floorManager.subtitle')}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
          <FloorManagerOverviewDate />
        </NPageHeaderActions>
      </NPageHeader>

      <NajmScroll axis="y" className="min-h-0 flex-1">
        <FloorManagerOverview />
      </NajmScroll>
    </div>
  );
};

export default FloorManagerDashboard;
