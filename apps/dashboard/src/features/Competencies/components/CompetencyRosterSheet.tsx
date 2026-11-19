'use client';

import type { CompetencyDomain, CompetencyLevel } from '@sms/contracts';
import { NAvatar, NSheet } from 'najm-kit';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { evaluationKey, monthLabel, type EvaluationIndex } from '../config/competencyLevels';
import { levelLabel } from '../config/competencyOptions';
import { LevelSignal } from './CompetencyVisuals';
import { CompetencyTextScope, useCompetencyText } from './CompetencyText';
import { LevelRow } from './LevelPicker';
import type { SheetStudent } from './StudentCompetencySheet';

const ROW = 'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-start text-card-foreground';

/**
 * One competency for the whole class: every pupil with their level this
 * month. A teacher taps a pupil to set the level in a popover, down the list.
 */
export function CompetencyRosterSheet(props: {
  competencyId: string | null;
  domains: CompetencyDomain[];
  students: SheetStudent[];
  index: EvaluationIndex;
  month: string;
  editable: boolean;
  onSetLevel: (competencyId: string, studentId: string, level: CompetencyLevel | null) => void;
  onClose: () => void;
}) {
  // The sheet is portalled out of the page, so it takes the list's language itself.
  return <CompetencyTextScope domains={props.domains}><RosterSheet {...props} /></CompetencyTextScope>;
}

function RosterSheet({ competencyId, domains, students, index, month, editable, onSetLevel, onClose }: Parameters<typeof CompetencyRosterSheet>[0]) {
  const { t, language, dir } = useCompetencyText();
  const domain = domains.find((item) => item.competencies.some((competency) => competency.id === competencyId));
  const competency = domain?.competencies.find((item) => item.id === competencyId);

  return (
    <NSheet
      open={!!competency}
      onOpenChange={(open) => { if (!open) onClose(); }}
      icon={FEATURE_ICONS.competencies}
      title={competency?.name ?? ''}
      description={domain ? `${domain.name} · ${monthLabel(month, language)}` : undefined}
      width={520}
      classNames={{ content: 'max-w-full bg-background', body: 'p-3' }}
    >
      {competency ? (
        <ul dir={dir} lang={language} aria-label={t('competencies.sheet.roster')} className="flex flex-col gap-2">
          {students.map((student) => {
            const level = index.get(evaluationKey(competency.id, student.id, month)) ?? null;
            const body = (
              <>
                <NAvatar src={student.image ?? undefined} fallback={student.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold"><bdi dir="auto">{student.name}</bdi></div>
                  {student.altName ? <div className="truncate text-xs leading-5"><bdi dir="auto">{student.altName}</bdi></div> : null}
                  <div className="truncate text-xs text-muted-foreground">{levelLabel(t, level)}</div>
                </div>
              </>
            );
            return (
              <li key={student.id}>
                {editable ? (
                  <LevelRow className={ROW} value={level} label={student.name} onChange={(next) => onSetLevel(competency.id, student.id, next)}>
                    {body}
                  </LevelRow>
                ) : <div className={ROW}>{body}<LevelSignal level={level} size="lg" /></div>}
              </li>
            );
          })}
        </ul>
      ) : null}
    </NSheet>
  );
}
