'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { NPageHeader, NPageHeaderActions } from 'najm-kit';
import AgingDetailTable from './components/AgingDetailTable';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

const AgingReportPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <NPageHeader
        icon={AlertTriangle}
        title={t('reports.aging.title')}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>
      <AgingDetailTable className="flex-1" />
    </div>
  );
};

export default AgingReportPage;
