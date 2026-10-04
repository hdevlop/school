'use client';

import { CalendarClock, UserRound } from 'lucide-react';
import { NBadge, NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import {
  PRIORITY_COLORS,
  STATUS_COLORS,
  TYPE_COLORS,
  alertSubject,
  type AlertRecord,
} from '../alertConstants';

export default function AlertCard({ data }: { data: AlertRecord }) {
  const { t } = useTranslation();
  const { displayDateTime } = useSchoolFormat();
  return (
    <div className="space-y-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{data.title}</span>
        <NBadge color={TYPE_COLORS[data.type]} label={t(`alerts.page.types.${data.type}`)} look="soft" />
        <NBadge color={PRIORITY_COLORS[data.priority]} label={t(`alerts.page.priorities.${data.priority}`)} look="soft" />
        <NBadge color={STATUS_COLORS[data.status]} label={t(`alerts.page.statuses.${data.status}`)} look="soft" />
      </div>
      <NSectionInfo
        icon={UserRound}
        label={t('alerts.page.about')}
        value={alertSubject(data) ?? t('alerts.page.schoolWide')}
        valueColor="text-foreground font-medium"
      />
      <NSectionInfo
        icon={CalendarClock}
        label={t('alerts.page.columns.date')}
        value={displayDateTime(data.createdAt)}
        valueColor="text-foreground font-medium"
      />
    </div>
  );
}
