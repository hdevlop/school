'use client';

import { ChevronRight } from 'lucide-react';
import type { CompetencyDomain } from '@sms/contracts';
import { cn } from 'najm-kit';
import { useCompetencyText } from './CompetencyText';
import { competencySummary, studentSummary, type EvaluationIndex } from '../config/competencyLevels';
import { LEVEL_TONE, levelLabel } from '../config/competencyOptions';
import { EvaluatedCount, LevelDistributionBar, LevelSignal } from './CompetencyVisuals';
import type { SheetStudent } from './StudentCompetencySheet';
import { StudentIdentity } from './StudentIdentity';

const CARD = 'group flex h-full w-full min-w-0 gap-3 rounded-xl border border-border/60 bg-card p-3 text-start text-card-foreground shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring @xl:p-4';

function OpenChevron() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted/70 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
      <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
    </span>
  );
}

/**
 * Each domain, then each competency with how many
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
    <div className="flex flex-col gap-5">
      {domains.map((domain) => (
        <section key={domain.id} aria-label={domain.name} className="grid gap-2.5">
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-1">
            <h2 className="text-base font-semibold"><bdi dir="auto">{domain.name}</bdi></h2>
            {domain.altName ? <span className="text-sm text-muted-foreground"><bdi dir="auto">{domain.altName}</bdi></span> : null}
          </header>
          {domain.competencies.length ? (
            <ul role="list" className="grid gap-3 @xl:grid-cols-2">
              {domain.competencies.map((item) => {
                const summary = competencySummary(index, item.id, studentIds, month);
                return (
                  <li key={item.id} className="min-w-0">
                    <button type="button" className={`${CARD} items-center`} onClick={() => onOpen(item.id)}>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 wrap-anywhere text-sm font-semibold leading-snug">
                            <bdi dir="auto">{item.name}</bdi>
                            {item.altName ? <div className="mt-1 text-sm font-normal text-muted-foreground"><bdi dir="auto">{item.altName}</bdi></div> : null}
                          </div>
                          <EvaluatedCount evaluated={summary.evaluated} total={summary.total}
                            label={t('competencies.card.evaluatedPupils', { evaluated: summary.evaluated, total: summary.total })} />
                        </div>
                        <LevelDistributionBar distribution={summary.distribution} total={summary.total} />
                      </div>
                      <OpenChevron />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}

/** Each pupil's overall level for the month and how many competencies have one. */
export function CompetencyStudentList({ students, index, competencyIds, month, onOpen, activeId, mobile = false }: {
  students: SheetStudent[];
  index: EvaluationIndex;
  competencyIds: string[];
  month: string;
  onOpen: (studentId: string) => void;
  /** The adjacent sheet identifies the active row in the desktop roster. */
  activeId?: string;
  mobile?: boolean;
}) {
  const { t } = useCompetencyText();
  if (mobile) {
    return (
      <ul role="list" className="grid gap-3">
        {students.map((student) => {
          const summary = studentSummary(index, competencyIds, student.id, month);
          const evaluated = t('competencies.card.evaluatedCompetencies', { evaluated: summary.evaluated, total: summary.total });
          return (
            <li key={student.id} className="min-w-0">
              <button type="button" onClick={() => onOpen(student.id)}
                className={cn(CARD, 'min-h-16 items-center gap-2 active:bg-accent/50 focus-visible:ring-inset')}>
                <StudentIdentity student={student} />
                <div className="grid shrink-0 justify-items-center gap-1">
                  {summary.level ? <LevelSignal level={summary.level} className="h-3" /> : null}
                  <EvaluatedCount evaluated={summary.evaluated} total={summary.total} label={evaluated} />
                </div>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground/70 rtl:rotate-180" />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul role="list" className={activeId ? 'divide-y divide-border/50' : 'grid gap-3 @xl:grid-cols-2 @5xl:grid-cols-3'}>
      {students.map((student) => {
        const summary = studentSummary(index, competencyIds, student.id, month);
        const coverage = summary.total > 0 ? (summary.evaluated / summary.total) * 100 : 0;
        const evaluated = t('competencies.card.evaluatedCompetencies', { evaluated: summary.evaluated, total: summary.total });
        if (activeId) {
          return (
            <li key={student.id}>
              <button type="button" aria-current={student.id === activeId ? 'true' : undefined} onClick={() => onOpen(student.id)}
                className={cn('flex w-full items-center gap-2 border-s-[3px] px-3 py-2.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  student.id === activeId ? 'border-s-primary bg-primary/[0.07]' : 'border-s-transparent hover:bg-muted/60')}>
                <StudentIdentity student={student} />
                <span className="grid min-w-10 max-w-24 shrink-0 gap-1 text-end" title={`${levelLabel(t, summary.level)} · ${evaluated}`}>
                  <span className="sr-only">{levelLabel(t, summary.level)} · {evaluated}</span>
                  {summary.level ? <span aria-hidden="true" className="text-xs font-medium">{levelLabel(t, summary.level)}</span> : null}
                  <bdi dir="ltr" aria-hidden="true" className="text-xs tabular-nums text-muted-foreground">{summary.evaluated}/{summary.total}</bdi>
                  <span aria-hidden="true" className="block h-1 overflow-hidden rounded-full bg-muted-foreground/15">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${coverage}%` }} />
                  </span>
                </span>
              </button>
            </li>
          );
        }
        return (
          <li key={student.id} className="min-w-0">
            <button type="button" className={`${CARD} flex-col justify-between`} onClick={() => onOpen(student.id)}>
              <div className="flex w-full items-center gap-3">
                <StudentIdentity student={student} />
                <OpenChevron />
              </div>
              <div className="w-full space-y-1.5">
                <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    {summary.level ? <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${LEVEL_TONE[summary.level].bar}`} /> : null}
                    {levelLabel(t, summary.level)}
                  </span>
                  <span title={evaluated}>
                    <span className="sr-only">{evaluated}</span>
                    <bdi dir="ltr" aria-hidden="true" className="font-semibold tabular-nums text-foreground">{summary.evaluated}/{summary.total}</bdi>
                  </span>
                </div>
                <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-muted-foreground/15">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${coverage}%` }} />
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
