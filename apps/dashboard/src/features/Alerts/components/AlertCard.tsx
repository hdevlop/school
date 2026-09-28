'use client';

import { CalendarClock, UserRound } from 'lucide-react';
import { NBadge, NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import {
  PRIORITY_COLORS,
  STATUS_COLORS,
  alertSubject,
  formatAlertDate,
  type AlertRecord,
} from '../alertConstants';

export default function AlertCard({ data }: { data: AlertRecord }) {
  const { t, language } = useTranslation();
  return (
    <div className="space-y-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{data.title}</span>
        <NBadge color={PRIORITY_COLORS[data.priority]} label={t(`alerts.page.priorities.${data.priority}`)} look="soft" size="sm" />
        <NBadge color={STATUS_COLORS[data.status]} label={t(`alerts.page.statuses.${data.status}`)} look="soft" size="sm" />
      </div>
      <p className="line-clamp-3 text-sm text-muted-foreground">{data.message}</p>
      <NSectionInfo
        icon={UserRound}
        label={t('alerts.page.about')}
        value={alertSubject(data) ?? t('alerts.page.schoolWide')}
        valueColor="text-foreground font-medium"
      />
      <NSectionInfo
        icon={CalendarClock}
        label={t('alerts.page.columns.date')}
        value={formatAlertDate(data.createdAt, language)}
        valueColor="text-foreground font-medium"
      />
    </div>
  );
}
