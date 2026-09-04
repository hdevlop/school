'use client';

import { CalendarClock, Clock3, Gavel, MapPin, RotateCcw, School, ShieldCheck, UserRound } from 'lucide-react';
import { NAvatar, NBadge, NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import {
  ACTION_COLORS,
  SEVERITY_COLORS,
  STATUS_COLORS,
  formatDisciplineDate,
  severityClassName,
  type DisciplineIncident,
} from '../disciplineConstants';

const DetailItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm text-foreground">{children || '—'}</div>
  </div>
);

export default function DisciplineDetails({
  incident,
  canResolve,
  onResolve,
  onReopen,
  resolving,
}: {
  incident: DisciplineIncident;
  canResolve: boolean;
  onResolve: () => void;
  onReopen: () => void;
  resolving?: boolean;
}) {
  const { t } = useTranslation();
  const resolved = incident.status === 'resolved';
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <NAvatar src={incident.student?.image} title={incident.student?.name || '—'} subtitle={incident.student?.studentCode} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <NBadge color={SEVERITY_COLORS[incident.severity]} className={severityClassName(incident.severity)} label={t(`discipline.severity.${incident.severity}`)} look="soft" />
            <NBadge color={STATUS_COLORS[incident.status]} label={t(`discipline.status.${incident.status}`)} look="soft" />
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            <School className="me-1 inline h-4 w-4" />
            {incident.class?.name || '—'} · {incident.section?.name || '—'}
          </div>
        </div>
        {canResolve && (
          <NButton
            type="button"
            variant={resolved ? 'secondary' : 'default'}
            loading={resolving}
            onClick={resolved ? onReopen : onResolve}
          >
            {resolved ? <RotateCcw className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            {resolved ? t('discipline.dialogs.reopenButton') : t('discipline.dialogs.resolveButton')}
          </NButton>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailItem label={t('discipline.table.violation')}>{t(`discipline.categories.${incident.category}`)}</DetailItem>
        <DetailItem label={t('discipline.table.incidentAt')}><CalendarClock className="me-1 inline h-4 w-4" />{formatDisciplineDate(incident.incidentAt)}</DetailItem>
        <DetailItem label={t('discipline.form.location')}><MapPin className="me-1 inline h-4 w-4" />{incident.location || '—'}</DetailItem>
        <DetailItem label={t('discipline.table.reportedBy')}><UserRound className="me-1 inline h-4 w-4" />{incident.reporter?.name || incident.reporter?.email || '—'}</DetailItem>
      </div>

      <DetailItem label={t('discipline.form.description')}>
        <p className="whitespace-pre-wrap leading-6">{incident.description}</p>
      </DetailItem>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailItem label={t('discipline.table.createdAt')}>{formatDisciplineDate(incident.createdAt)}</DetailItem>
        <DetailItem label={t('discipline.table.updatedAt')}>{formatDisciplineDate(incident.updatedAt)}</DetailItem>
      </div>

      {resolved && (
        <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 font-semibold"><Gavel className="h-4 w-4" />{t('discipline.dialogs.resolutionTitle')}</div>
          <div className="flex flex-wrap gap-2">
            {incident.actionType && <NBadge color={ACTION_COLORS[incident.actionType]} label={t(`discipline.actions.${incident.actionType}`)} look="soft" />}
          </div>
          {incident.actionNote && <DetailItem label={t('discipline.form.actionNote')}>{incident.actionNote}</DetailItem>}
          <DetailItem label={t('discipline.form.resolutionNote')}>{incident.resolutionNote}</DetailItem>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem label={t('discipline.table.resolvedBy')}>{incident.resolver?.name || incident.resolver?.email || '—'}</DetailItem>
            <DetailItem label={t('discipline.table.resolvedAt')}><Clock3 className="me-1 inline h-4 w-4" />{formatDisciplineDate(incident.resolvedAt)}</DetailItem>
          </div>
        </div>
      )}
    </div>
  );
}
