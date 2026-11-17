'use client';

import { ChevronRight } from 'lucide-react';
import type { CompetencyDomain } from '@sms/contracts';
import { NAvatar } from 'najm-kit';
import { useCompetencyText } from './CompetencyText';
import { competencySummary, studentSummary, type EvaluationIndex } from '../config/competencyLevels';
import { EvaluatedRing, LevelDistributionBar, LevelSignal } from './CompetencyVisuals';
import type { SheetStudent } from './StudentCompetencySheet';

const ROW = 'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-start transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * By competency (mockup 2): each domain, then each competency with how many
 * pupils were evaluated this month and how they spread across the levels.
 */
export function CompetencyOverview({ domains, index, studentIds, month, onOpen }: {
  domains: CompetencyDomain[];
  index: EvaluationIndex;
  studentIds: string[];
  month: string;
  onOpen: (competencyId: string) => void;
}) {
  const { t } = useCompetencyText();
  return (
    <div className="flex flex-col gap-2">
      {domains.map((domain) => (
        <section key={domain.id} aria-label={domain.name} className="flex flex-col gap-2">
          <header className="flex items-baseline justify-between gap-2 px-1 pt-1">
            <h3 className="text-sm font-semibold"><bdi dir="auto">{domain.name}</bdi></h3>
            {domain.altName ? <span className="text-xs text-muted-foreground"><bdi dir="auto">{domain.altName}</bdi></span> : null}
          </header>
          {domain.competencies.map((item) => {
            const summary = competencySummary(index, item.id, studentIds, month);
            return (
              <button key={item.id} type="button" className={ROW} onClick={() => onOpen(item.id)}>
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-snug"><bdi dir="auto">{item.name}</bdi></div>
                    {item.altName ? <div className="mt-1 text-[13px] leading-5"><bdi dir="auto">{item.altName}</bdi></div> : null}
                  </div>
                  <LevelDistributionBar distribution={summary.distribution} total={summary.total} />
                </div>
                <EvaluatedRing evaluated={summary.evaluated} total={summary.total}
                  label={t('competencies.card.evaluatedPupils', { evaluated: summary.evaluated, total: summary.total })} />
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/** By pupil (mockup 1): each pupil's overall level this month and how many competencies have one. */
export function CompetencyStudentList({ students, index, competencyIds, month, onOpen }: {
  students: SheetStudent[];
  index: EvaluationIndex;
  competencyIds: string[];
  month: string;
  onOpen: (studentId: string) => void;
}) {
  const { t } = useCompetencyText();
  return (
    <div className="flex flex-col gap-2">
      {students.map((student) => {
        const summary = studentSummary(index, competencyIds, student.id, month);
        return (
          <button key={student.id} type="button" className={ROW} onClick={() => onOpen(student.id)}>
            <NAvatar src={student.image ?? undefined} fallback={student.name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{student.name}</div>
              {student.altName ? <div className="truncate text-sm leading-6"><bdi dir="auto">{student.altName}</bdi></div> : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1"
              title={t('competencies.card.evaluatedCompetencies', { evaluated: summary.evaluated, total: summary.total })}>
              <LevelSignal level={summary.level} />
              <span className="text-[11px] text-muted-foreground tabular-nums">{summary.evaluated}/{summary.total}</span>
            </div>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
          </button>
        );
      })}
    </div>
  );
}
