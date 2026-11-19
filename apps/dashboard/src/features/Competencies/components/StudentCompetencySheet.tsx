'use client';

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FileChartColumn } from 'lucide-react';
import type { CompetencyDomain, CompetencyLevel, CompetencyRemark } from '@sms/contracts';
import { cn, Tabs, TabsContent, TabsList, TabsTrigger } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import {
  evaluationKey, monthLabel, rankChange, studentSummary, LEVEL_RANK, type EvaluationIndex,
} from '../config/competencyLevels';
import { levelLabel } from '../config/competencyOptions';
import { catalogLanguage } from '../config/competencyLanguage';
import { proposeRemark } from '../config/competencyRemarks';
import { ChangeMark, LevelSignal } from './CompetencyVisuals';
import { CompetencyRemarkFooter } from './CompetencyRemarkFooter';
import { useCompetencyText } from './CompetencyText';
import { LevelRow } from './LevelPicker';
import { StudentIdentity } from './StudentIdentity';

export type SheetView = 'competencies' | 'report';

export type SheetStudent = { id: string; name: string; altName?: string | null; image?: string | null; gender?: 'M' | 'F' | null };

const ROW = 'flex min-h-16 w-full items-center gap-2 px-3 py-2 text-start @xl/sheet:px-4';
const SHEET = '@container/sheet flex min-w-0 flex-col gap-4';
const TAB = 'min-w-0 gap-1.5 rounded-md px-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground';

/**
 * One pupil's sheet in one subject (mockup 3): the month's overall level and
 * its change since September, then each domain and competency with the
 * level, September's, and the change. A teacher taps a row to set its level
 * in a popover over it. At the foot, the teacher's remark for the parents.
 */
export function StudentCompetencySheet({
  student, domains, index, month, baselineMonth, editable = false, onSetLevel, remark, onSaveRemark, report, emptyState,
  view, onViewChange, switchElsewhere = false,
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
  report?: ReactNode;
  emptyState?: ReactNode;
  /** Given with onViewChange when the page keeps the open view, so its header can switch it. */
  view?: SheetView;
  onViewChange?: (view: SheetView) => void;
  /** The page's header shows the switch (a phone's top bar), so the sheet does not repeat it. */
  switchElsewhere?: boolean;
}) {
  const { t, language, dir } = useCompetencyText();
  const page = useTranslation();
  const [ownTab, setOwnTab] = useState<SheetView>('competencies');
  const tab = view ?? ownTab;
  const setTab = (next: SheetView) => { setOwnTab(next); onViewChange?.(next); };
  // The report is built the first time it opens, then kept so switching back is instant.
  const [reportOpened, setReportOpened] = useState(tab === 'report');
  if (tab === 'report' && !reportOpened) setReportOpened(true);
  const headerRef = useRef<HTMLElement>(null);
  const previousStudent = useRef(student.id);
  useLayoutEffect(() => {
    if (previousStudent.current === student.id) return;
    previousStudent.current = student.id;
    headerRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [student.id]);
  const compares = month !== baselineMonth;
  const baselineShort = monthLabel(baselineMonth, language, 'short');

  const competencyIds = useMemo(() => domains.flatMap((domain) => domain.competencies.map((item) => item.id)), [domains]);
  const now = studentSummary(index, competencyIds, student.id, month);
  const before = studentSummary(index, competencyIds, student.id, baselineMonth);
  const change = compares ? rankChange(now.rank, before.rank) : null;
  const changeLabel = (value: number | null) => t('competencies.card.change', { month: baselineShort, value: value ?? 0 });
  const evaluatedLabel = t('competencies.card.evaluatedCompetencies', { evaluated: now.evaluated, total: now.total });
  const monthSheetKey = `${student.id}:${month}`;

  const header = (
    <header ref={headerRef} className={cn(
      'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-border/70 border-s-4 border-s-primary bg-card px-3 py-2.5 text-card-foreground @xl/sheet:gap-6 @xl/sheet:p-4',
      report && '@3xl/sheet:grid-cols-[minmax(0,1fr)_auto_auto]',
    )}>
      <StudentIdentity student={student} prominent />
      <div className={cn(
        'grid max-w-28 justify-items-end gap-1 border-s border-border/60 ps-2.5 text-end @xl/sheet:min-w-48 @xl/sheet:max-w-none @xl/sheet:justify-items-start @xl/sheet:gap-1.5 @xl/sheet:ps-5 @xl/sheet:text-start',
        report && '@3xl/sheet:col-start-3 @3xl/sheet:row-start-1',
      )}>
        <div className="flex items-center gap-2">
          <LevelSignal level={now.level} className="hidden @xl/sheet:inline-flex" />
          <span className="wrap-anywhere text-xs font-semibold @xl/sheet:text-sm">{levelLabel(t, now.level)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs text-muted-foreground @xl/sheet:justify-start">
          <span className="sr-only @xl/sheet:not-sr-only">{evaluatedLabel}</span>
          <bdi dir="ltr" aria-hidden="true" title={evaluatedLabel} className="tabular-nums @xl/sheet:hidden">{now.evaluated}/{now.total}</bdi>
          <ChangeMark change={change} label={changeLabel(change)} />
        </div>
      </div>
      {report && !switchElsewhere && (
        <TabsList aria-label={page.t('competencies.sheet.title')} className="col-span-2 h-9 w-full rounded-lg border border-border/70 bg-card p-0.5 @3xl/sheet:col-span-1 @3xl/sheet:col-start-2 @3xl/sheet:row-start-1 @3xl/sheet:w-auto">
          <TabsTrigger value="competencies" className={TAB}>
            <FEATURE_ICONS.competencies aria-hidden="true" className="size-4 shrink-0" />
            {page.t('competencies.title')}
          </TabsTrigger>
          <TabsTrigger value="report" className={TAB}>
            <FileChartColumn aria-hidden="true" className="size-4 shrink-0" />
            {page.t('competencies.report.tab')}
          </TabsTrigger>
        </TabsList>
      )}
    </header>
  );

  const competencies = emptyState ?? (
    <>
      <div className="grid min-w-0 items-start gap-3 @3xl/sheet:grid-cols-2">
        {domains.map((domain) => {
          const summary = studentSummary(index, domain.competencies.map((item) => item.id), student.id, month);
          return (
            <section key={`${monthSheetKey}:${domain.id}`} aria-label={domain.name} className="min-w-0 rounded-xl border border-border/70 bg-card text-card-foreground">
              <header className="flex flex-wrap items-baseline justify-between gap-2 rounded-t-xl border-b border-border/60 bg-muted/45 px-3 py-2.5 @xl/sheet:px-4">
                <h3 className="wrap-anywhere text-base font-semibold"><bdi dir="auto">{domain.name}</bdi></h3>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {summary.level ? levelLabel(t, summary.level) : null}
                  <bdi dir="ltr" className="tabular-nums" title={t('competencies.card.evaluatedCompetencies', { evaluated: summary.evaluated, total: summary.total })}>{summary.evaluated}/{summary.total}</bdi>
                </span>
              </header>
              <div className="divide-y divide-border/50">
                {domain.competencies.map((item) => {
                  const level = index.get(evaluationKey(item.id, student.id, month)) ?? null;
                  const earlier = compares ? index.get(evaluationKey(item.id, student.id, baselineMonth)) ?? null : null;
                  const rowChange = compares && level && earlier ? LEVEL_RANK[level] - LEVEL_RANK[earlier] : null;
                  const levelDescription = compares && (earlier || level)
                    ? `${levelLabel(t, level)} · ${baselineShort} ${levelLabel(t, earlier)}`
                    : levelLabel(t, level);
                  const body = (
                    <>
                      <div className="min-w-0 flex-1">
                        {/* The name and the levels only, as mockup 3: the second-language name is on the lists. */}
                        <div className="wrap-anywhere text-sm font-medium leading-snug"><bdi dir="auto">{item.name}</bdi></div>
                        <div className="mt-1 text-xs text-muted-foreground">{levelDescription}</div>
                      </div>
                      <ChangeMark change={rowChange} label={changeLabel(rowChange)} signed={false} />
                    </>
                  );
                  return editable ? (
                    <LevelRow key={item.id} signal="row" className={ROW} value={level} label={item.name} onChange={(next) => onSetLevel?.(item.id, next)}>
                      {body}
                    </LevelRow>
                  ) : (
                    <div key={item.id} className={ROW}>{body}<LevelSignal level={level} /></div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <CompetencyRemarkFooter key={monthSheetKey} remark={remark} onSave={onSaveRemark}
        // A remark drafted from this month's levels, in the list's language, for the teacher to edit.
        propose={onSaveRemark && now.evaluated > 0 ? () => proposeRemark({
          domains,
          levelOf: (competencyId) => index.get(evaluationKey(competencyId, student.id, month)),
          gender: student.gender,
          language: catalogLanguage(domains) === 'ar' ? 'ar' : 'fr',
        }) : undefined} />
    </>
  );

  if (!report) return <div className={SHEET}>{header}{competencies}</div>;

  return (
    <Tabs value={tab} dir={dir} onValueChange={(value) => setTab(value as SheetView)} className={SHEET}>
      {header}
      <TabsContent value="competencies" forceMount className="m-0 flex min-w-0 flex-col gap-4 data-[state=inactive]:hidden">
        {competencies}
      </TabsContent>
      <TabsContent value="report" forceMount className="m-0 min-w-0 data-[state=inactive]:hidden">
        {reportOpened && report}
      </TabsContent>
    </Tabs>
  );
}
