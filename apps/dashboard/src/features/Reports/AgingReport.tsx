'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { NPageHeader, NPageHeaderActions } from 'najm-kit';
import AgingDetailTable from './components/AgingDetailTable';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';

const AgingReportPage: React.FC = () => {
  const { t } = useTranslation();
  const { viewingYear } = useViewingAcademicYear();

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <NPageHeader
        icon={AlertTriangle}
        title={t('reports.aging.title')}
        subtitle={viewingYear ? t('reports.year', { year: viewingYear }) : undefined}
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
