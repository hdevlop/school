'use client';

import { useMemo } from 'react';
import type { CompetencyDomain, CompetencyLevel, CompetencyRemark } from '@sms/contracts';
import { NAvatar } from 'najm-kit';
import {
  averageRank, evaluationKey, levelOfRank, monthLabel, rankChange, studentSummary, LEVEL_RANK, type EvaluationIndex,
} from '../config/competencyLevels';
import { levelLabel } from '../config/competencyOptions';
import { ChangeMark, LevelSignal } from './CompetencyVisuals';
import { CompetencyRemarkFooter } from './CompetencyRemarkFooter';
import { useCompetencyText } from './CompetencyText';
import { LevelPopover } from './LevelPicker';

export type SheetStudent = { id: string; name: string; altName?: string | null; image?: string | null };

const ROW = 'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-start';

/**
 * One pupil's sheet in one subject (mockup 3): the month's overall level and
 * its change since September, then each domain and competency with the
 * level, September's, and the change. A teacher taps a row to set its level
 * in a popover over it. At the foot, the teacher's remark for the parents.
 */
export function StudentCompetencySheet({
  student, domains, index, month, baselineMonth, editable = false, onSetLevel, remark, onSaveRemark,
}: {
  student: SheetStudent;
  domains: CompetencyDomain[];
  index: EvaluationIndex;
  month: string;
  baselineMonth: string;
  editable?: boolean;
  onSetLevel?: (competencyId: string, level: CompetencyLevel | null) => void;
  remark?: CompetencyRemark | null;
  /** Given to whoever may write the remark. */
  onSaveRemark?: (body: string) => Promise<unknown>;
}) {
  const { t, language } = useCompetencyText();
  const compares = month !== baselineMonth;
  const baselineShort = monthLabel(baselineMonth, language, 'short');

  const competencyIds = useMemo(() => domains.flatMap((domain) => domain.competencies.map((item) => item.id)), [domains]);
  const now = studentSummary(index, competencyIds, student.id, month);
  const before = studentSummary(index, competencyIds, student.id, baselineMonth);
  const change = compares ? rankChange(now.rank, before.rank) : null;
  const changeLabel = (value: number | null) => t('competencies.card.change', { month: baselineShort, value: value ?? 0 });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <NAvatar src={student.image ?? undefined} fallback={student.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold"><bdi dir="auto">{student.name}</bdi></div>
          {student.altName ? <div className="truncate text-sm"><bdi dir="auto">{student.altName}</bdi></div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <span className="font-semibold text-sm">{levelLabel(t, now.level)}</span>
          <span className="text-muted-foreground tabular-nums">· {now.evaluated}/{now.total}</span>
          <ChangeMark change={change} label={changeLabel(change)} />
          <LevelSignal level={now.level} />
        </div>
      </div>

      {domains.map((domain) => {
        const levels = domain.competencies.map((item) => index.get(evaluationKey(item.id, student.id, month)));
        const domainLevel = levelOfRank(averageRank(levels));
        return (
          <section key={domain.id} aria-label={domain.name} className="flex flex-col gap-2">
            <header className="flex items-baseline justify-between gap-2 px-1 pt-1">
              <h3 className="text-sm font-semibold"><bdi dir="auto">{domain.name}</bdi></h3>
              <span className="text-xs text-muted-foreground">{domainLevel ? levelLabel(t, domainLevel) : '—'}</span>
            </header>
            {domain.competencies.map((item) => {
              const level = index.get(evaluationKey(item.id, student.id, month)) ?? null;
              const earlier = compares ? index.get(evaluationKey(item.id, student.id, baselineMonth)) ?? null : null;
              const rowChange = compares && level && earlier ? LEVEL_RANK[level] - LEVEL_RANK[earlier] : null;
              const summary = compares
                ? `${levelLabel(t, level)} · ${baselineShort} ${levelLabel(t, earlier)}`
                : levelLabel(t, level);
              const body = (
                <>
                  <div className="min-w-0 flex-1">
                    {/* The name and the levels only, as mockup 3: the second-language name is on the lists. */}
                    <div className="text-sm font-medium leading-snug"><bdi dir="auto">{item.name}</bdi></div>
                    <div className="mt-1 text-xs text-muted-foreground">{summary}</div>
                  </div>
                  <ChangeMark change={rowChange} label={changeLabel(rowChange)} signed={false} />
                  <LevelSignal level={level} size="lg" />
                </>
              );
              return editable ? (
                <LevelPopover key={item.id} value={level} label={item.name} onChange={(next) => onSetLevel?.(item.id, next)}>
                  <button type="button"
                    className={`${ROW} transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:ring-1 data-[state=open]:ring-ring`}>
                    {body}
                  </button>
                </LevelPopover>
              ) : (
                <div key={item.id} className={ROW}>{body}</div>
              );
            })}
          </section>
        );
      })}

      <CompetencyRemarkFooter key={`${student.id}:${month}`} remark={remark} onSave={onSaveRemark} />
    </div>
  );
}
