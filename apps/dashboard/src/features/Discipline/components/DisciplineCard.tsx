'use client';

import { CalendarClock, School, ShieldAlert } from 'lucide-react';
import { NAvatar, NBadge, NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import {
  SEVERITY_COLORS,
  STATUS_COLORS,
  formatDisciplineDate,
  severityClassName,
  type DisciplineIncident,
} from '../disciplineConstants';

export default function DisciplineCard({ data }: { data: DisciplineIncident }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 p-3">
      <NAvatar src={data.student?.image} title={data.student?.name || '—'} subtitle={data.student?.studentCode} size="md" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{t(`discipline.categories.${data.category}`)}</span>
          <NBadge color={SEVERITY_COLORS[data.severity]} className={severityClassName(data.severity)} label={t(`discipline.severity.${data.severity}`)} look="soft" size="sm" />
          <NBadge color={STATUS_COLORS[data.status]} label={t(`discipline.status.${data.status}`)} look="soft" size="sm" />
        </div>
        <NSectionInfo
          icon={School}
          label={t('discipline.table.classSection')}
          value={`${data.class?.name || '—'} · ${data.section?.name || '—'}`}
          valueColor="text-foreground font-medium"
        />
        <NSectionInfo
          icon={CalendarClock}
          label={t('discipline.table.incidentAt')}
          value={formatDisciplineDate(data.incidentAt)}
          valueColor="text-foreground font-medium"
        />
        <NSectionInfo
          icon={ShieldAlert}
          label={t('discipline.table.student')}
          value={`${data.student?.name || '—'} · ${data.student?.studentCode || '—'}`}
          valueColor="text-foreground font-medium"
        />
      </div>
    </div>
  );
}
