'use client';

import { CalendarClock, School } from 'lucide-react';
import { NAvatar, NBadge, NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { avatarVersion } from '@/lib/avatarVersion';
import { PersonCard } from '@/shared/PersonCard';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import {
  STATUS_COLORS,
  type DisciplineIncident,
} from '../disciplineConstants';

export default function DisciplineCard({ data }: { data: DisciplineIncident }) {
  const { t } = useTranslation();
  const { displayDateTime } = useSchoolFormat();
  return (
    <PersonCard
      avatar={(
        <NAvatar
          src={data.student?.image}
          fallback={data.student?.name || '—'}
          size="lg"
          version={avatarVersion(data.student?.image, data.student?.updatedAt)}
        />
      )}
      name={(
        <span className="flex min-w-0 items-start justify-between gap-2">
          <span className="min-w-0 wrap-break-word">{data.student?.name || '—'}</span>
          <NBadge
            color={STATUS_COLORS[data.status]}
            label={t(`discipline.status.${data.status}`)}
            look="soft"
            className="shrink-0 font-normal"
          />
        </span>
      )}
      meta={data.student?.studentCode && (
        <bdi dir="ltr" className="font-mono text-xs text-muted-foreground">{data.student.studentCode}</bdi>
      )}
    >
        <p className="flex items-start gap-2 text-sm font-semibold">
          <FEATURE_ICONS.discipline className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>{t(`discipline.categories.${data.category}`)}</span>
        </p>
        <NSectionInfo
          icon={School}
          label={t('discipline.table.classSection')}
          value={`${data.class?.name || '—'} · ${data.section?.name || '—'}`}
          valueColor="text-foreground font-medium"
          maxChars={64}
          className="flex-wrap"
        />
        <NSectionInfo
          icon={CalendarClock}
          label={t('discipline.table.incidentAt')}
          value={<time dateTime={data.incidentAt}>{displayDateTime(data.incidentAt)}</time>}
          valueColor="text-foreground font-medium"
          maxChars={64}
          className="flex-wrap"
        />
    </PersonCard>
  );
}
