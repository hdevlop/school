'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Files, Printer, RotateCcw, Search, Sparkles } from 'lucide-react';
import type { CompetencyAssignment, CompetencyDomain, MassarGradeSource, MassarSheetDetail } from '@sms/contracts';
import { schoolI18n, type SchoolTranslationKey } from '@sms/contracts/locales';
import { cn, NajmScroll, NButton, NEmptyState, NErrorState, NPageHeaderActions, NSkeleton, SelectInput, Textarea, TextInput, useMediaQuery } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useSchoolPrintOptions } from '@/hooks/useSchoolPrintOptions';
import { printSchoolDocument } from '@/shared/schoolPrintDocument';
import { useMassarRead } from '@/features/Massar/hooks/useMassar';
import { NOTES_MASSAR_API } from '@/features/Grades/hooks/useMassarGrades';
import { useCompetencyYearLevels } from '../hooks/useCompetencies';
import { followUps, type FollowUp } from '../config/followUpReport';
import { analyze, rankLabel } from '../config/followUpAnalysis';
import { buildFollowUpDocument, type FollowUpPrintOptions } from '../config/followUpDocument';
import { CompetencyTextScope, useListText } from './CompetencyText';
import { StudentIdentity } from './StudentIdentity';
import type { SheetStudent } from './StudentCompetencySheet';

type Props = {
  assignment: CompetencyAssignment;
  domains: CompetencyDomain[];
  /** The class roster, for each pupil's gender: the analysis agrees with it. */
  students: SheetStudent[];
  onBack: () => void;
};

/**
 * تقارير التتبع of one class and subject after a Massar Contrôle, one A4 page
 * per pupil. The teacher picks the Contrôle and a pupil, reviews the report,
 * and prints it or the whole class's. The marks are the Massar grid's,
 * read through Notes' own permission, so a teacher reaches their own grids
 * only; an Arabic list's report reads in Arabic, with French captions.
 */
export function FollowUpReports({ assignment, domains, students, onBack }: Props) {
  // The header, filters and pupil list read in the interface language, as the
  // competencies page's do; the report itself in its list's language.
  const page = useTranslation();
  const { t, language, dir } = useListText(domains);
  const wide = useMediaQuery('(min-width: 1100px)');
  const printOptions = useSchoolPrintOptions();
  const sources = useMassarRead<MassarGradeSource[]>('/sources', true, 0, NOTES_MASSAR_API);
  // The class and subject's Massar grids, one per Contrôle, in the year's order.
  const rounds = useMemo(() => {
    const seen = new Map<string, MassarGradeSource>();
    for (const source of sources.data ?? []) {
      if (source.sectionId === assignment.sectionId && source.subjectId === assignment.subjectId && !seen.has(source.sheetId)) seen.set(source.sheetId, source);
    }
    return [...seen.values()].sort((a, b) => a.term - b.term || a.exam - b.exam);
  }, [sources.data, assignment.sectionId, assignment.subjectId]);
  const [pickedRound, setRound] = useState('');
  const round = rounds.find((item) => item.sheetId === pickedRound) ?? rounds.at(-1);
  const sheet = useMassarRead<MassarSheetDetail>(`/sheets/${encodeURIComponent(round?.sheetId ?? '')}`, !!round, 0, NOTES_MASSAR_API);
  const year = useCompetencyYearLevels(assignment.teacherAssignmentId);
  const reports = useMemo(() => (sheet.data && year.data ? followUps({
    sheet: sheet.data, domains, evaluations: year.data.evaluations, remarks: year.data.remarks, months: year.data.months,
  }) : []), [sheet.data, year.data, domains]);
  // The analysis of each pupil, as the rules write it; the teacher may edit it before printing (not saved).
  const generated = useMemo(() => {
    const gender = new Map(students.map((student) => [student.id, student.gender ?? null]));
    const maxMark = sheet.data?.maxMark ?? 10;
    return new Map(reports.map((item) => [item.student.id, analyze(item, {
      maxMark, language: language === 'ar' ? 'ar' : 'fr', gender: gender.get(item.student.id) as 'M' | 'F' | null, levelLabel: rankLabel(t),
    })]));
  }, [reports, students, sheet.data, language, t]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const editKey = (item: FollowUp) => `${round?.sheetId}:${item.student.id}`;
  const analysisOf = (item: FollowUp) => edits[editKey(item)] ?? generated.get(item.student.id) ?? '';
  const [pickedPupil, setPupil] = useState('');
  const index = Math.max(0, reports.findIndex((report) => report.student.id === pickedPupil));
  const report = reports[index];

  const documentFor = (chosen: readonly FollowUp[], mode: 'print' | 'preview' = 'print') => {
    const detail = sheet.data!;
    const { school, assetOrigin } = printOptions({ title: t('competencies.report.title'), date: '', details: [], columns: [] });
    // Small captions in the other language of the school: French under Arabic, Arabic under French.
    const second = language === 'ar' ? 'fr' : language === 'fr' ? 'ar' : null;
    const options: FollowUpPrintOptions = {
      language, dir, t,
      caption: second ? (key, params) => schoolI18n.translate(second, key as SchoolTranslationKey, params) : null,
      school: { name: detail.schoolName || school.name, logo: school.logo }, assetOrigin,
      subjectName: assignment.subjectName, className: detail.sheet.className, levelLabel: detail.levelLabel,
      examLabel: detail.round.examLabel, termLabel: detail.round.termLabel, yearLabel: detail.yearLabel,
      teacherName: detail.sheet.teacherName ?? assignment.teacherName ?? null, maxMark: detail.maxMark,
      analysisOf,
    };
    return buildFollowUpDocument(chosen, options, mode);
  };

  const isLoading = sources.isLoading || (round && sheet.isLoading) || year.isLoading;
  const hasReport = !!report && !isLoading && !sources.error && !sheet.error && !year.error;
  let body: ReactNode;
  if (isLoading) body = <NSkeleton className="h-[60vh] rounded-xl" />;
  else if (sources.error || sheet.error) body = <NErrorState surface="panel" title={t('competencies.report.failed')} onRetry={() => { void sources.refetch(); void sheet.refetch(); }} />;
  else if (year.error) body = <NErrorState surface="panel" onRetry={() => void year.refetch()} />;
  else if (!round) body = <NEmptyState surface="panel" icon={FEATURE_ICONS.competencies} title={t('competencies.report.noRound')} />;
  else if (!report) body = <NEmptyState surface="panel" icon={FEATURE_ICONS.competencies} title={t('competencies.empty.noStudents')} />;
  else {
    const key = editKey(report);
    const edited = edits[key] !== undefined;
    body = (
      <>
        <details className="group rounded-xl border border-border/60 bg-card">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring @xl:px-4 [&::-webkit-details-marker]:hidden">
            <Sparkles aria-hidden="true" className="size-4 shrink-0 text-primary" />
            {t('competencies.report.analysis')}
            <ChevronDown aria-hidden="true" className="ms-auto size-4 shrink-0 text-muted-foreground group-open:rotate-180" />
          </summary>
          <div className="grid gap-2 border-t border-border/60 p-3 @xl:px-4">
            <Textarea value={analysisOf(report)} dir={dir} rows={4} className="min-h-24 resize-y text-sm leading-relaxed"
              onChange={(event) => { const value = event.target.value; setEdits((current) => ({ ...current, [key]: value })); }}
              aria-label={t('competencies.report.analysis')} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{t('competencies.report.analysisHint')}</p>
              {edited ? (
                <NButton type="button" size="sm" variant="ghost" leftIcon={<RotateCcw className="size-4" />}
                  onClick={() => setEdits(({ [key]: _dropped, ...rest }) => rest)}>
                  {t('competencies.report.analysisReset')}
                </NButton>
              ) : null}
            </div>
          </div>
        </details>
        <PagePreview key={key} html={documentFor([report], 'preview')} title={`${t('competencies.report.title')} · ${report.student.name}`} />
      </>
    );
  }

  const step = (by: number) => { const next = reports[index + by]; if (next) setPupil(next.student.id); };
  const [search, setSearch] = useState('');
  const pupils = useMemo(() => {
    const roster = new Map(students.map((student) => [student.id, student]));
    return reports.map((item): SheetStudent => roster.get(item.student.id) ?? { id: item.student.id, name: item.student.name });
  }, [reports, students]);
  const query = search.trim().toLowerCase();
  const shown = query ? pupils.filter((pupil) => `${pupil.name} ${pupil.altName ?? ''}`.toLowerCase().includes(query)) : pupils;

  const reportArea = (
    <CompetencyTextScope domains={domains} className="@container flex min-w-0 flex-col gap-2 pb-6">{body}</CompetencyTextScope>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader icon={FEATURE_ICONS.competencies} title={page.t('competencies.report.open')}
        subtitle={`${assignment.className} · ${assignment.sectionName} · ${assignment.subjectName}`}
        onBack={onBack} backLabel={page.t('competencies.sheet.back')}>
        <NPageHeaderActions>
          <NButton type="button" variant="outline" onClick={onBack} leftIcon={<ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />}>
            {page.t('competencies.sheet.back')}
          </NButton>
          {hasReport ? (
            <>
              <NButton type="button" variant="outline" onClick={() => void printSchoolDocument(documentFor(reports))}
                leftIcon={<Files aria-hidden="true" className="size-4 shrink-0" />}>
                {page.t('competencies.report.printAll', { count: reports.length })}
              </NButton>
              <NButton type="button" onClick={() => void printSchoolDocument(documentFor([report]))}
                leftIcon={<Printer aria-hidden="true" className="size-4 shrink-0" />}>
                {page.t('competencies.report.print')}
              </NButton>
            </>
          ) : null}
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      {/* One bare row, as the competencies page's filters. On a wide screen the pupils are the list on the left instead. */}
      {round ? (
        <section aria-label={page.t('common.table.filterRegion')} className="grid shrink-0 gap-2 lg:flex">
          <div className="min-w-0 lg:w-64">
            <SelectInput value={round.sheetId} onChange={(value) => { setRound(value); setPupil(''); }} className="w-full min-w-0" showIcon={false}
              items={rounds.map((item) => ({ value: item.sheetId, label: `${item.examLabel} · ${item.termLabel}` }))}
              placeholder={page.t('competencies.report.round')} ariaLabel={page.t('competencies.report.round')} />
          </div>
          {wide ? null : (
            <div className="flex min-w-0 items-center gap-1.5 lg:w-96">
              <NButton type="button" size="icon" variant="outline" className="size-10 shrink-0" disabled={!hasReport || index === 0} onClick={() => step(-1)} aria-label={page.t('competencies.report.previous')}>
                <ChevronLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
              </NButton>
              <SelectInput value={hasReport ? report.student.id : ''} onChange={setPupil} className="min-w-0 flex-1" showIcon={false} disabled={!hasReport}
                items={reports.map((item) => ({ value: item.student.id, label: item.student.name }))}
                ariaLabel={page.t('competencies.report.pupilName')} placeholder={page.t('competencies.filters.search')} />
              {hasReport ? <bdi dir="ltr" className="shrink-0 px-1 text-xs tabular-nums text-muted-foreground">{index + 1}/{reports.length}</bdi> : null}
              <NButton type="button" size="icon" variant="outline" className="size-10 shrink-0" disabled={!hasReport || index >= reports.length - 1} onClick={() => step(1)} aria-label={page.t('competencies.report.next')}>
                <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
              </NButton>
            </div>
          )}
        </section>
      ) : null}

      {wide && hasReport ? (
        <div className="grid min-h-0 flex-1 grid-cols-[clamp(16rem,24%,24rem)_minmax(0,1fr)] gap-2">
          <section aria-label={page.t('competencies.sheet.roster')} className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card">
            <div className="grid shrink-0 gap-2 border-b border-border/60 p-3">
              <h2 className="flex items-center justify-between gap-2 text-base font-semibold">
                {page.t('competencies.sheet.roster')}
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{shown.length}</span>
              </h2>
              <TextInput value={search} onChange={setSearch} placeholder={page.t('competencies.filters.searchPlaceholder')} aria-label={page.t('competencies.filters.search')}
                icon={Search} className="w-full min-w-0 [&_input]:text-sm" />
            </div>
            <NajmScroll axis="y" autoHide="scroll" className="min-h-0 flex-1">
              {shown.length ? (
                <ul role="list" className="divide-y divide-border/50">
                  {shown.map((pupil) => {
                    const active = pupil.id === report.student.id;
                    return (
                      <li key={pupil.id}>
                        <button type="button" aria-current={active ? 'true' : undefined} onClick={() => setPupil(pupil.id)}
                          className={cn('flex w-full items-center gap-2 border-s-[3px] px-3 py-2.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                            active ? 'border-s-primary bg-primary/[0.07]' : 'border-s-transparent hover:bg-muted/60')}>
                          <StudentIdentity student={pupil} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="p-4 text-center text-sm text-muted-foreground">{page.t('competencies.empty.noMatch')}</p>}
            </NajmScroll>
          </section>
          <NajmScroll key={report.student.id} axis="y" autoHide="scroll" className="min-h-0 min-w-0">{reportArea}</NajmScroll>
        </div>
      ) : (
        <NajmScroll axis="y" autoHide="scroll" className="min-h-0 flex-1">{reportArea}</NajmScroll>
      )}
    </div>
  );
}

function PagePreview({ html, title }: { html: string; title: string }) {
  const observer = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(900);
  const preview = useDeferredValue(html);
  useEffect(() => () => observer.current?.disconnect(), []);

  const observeHeight = (event: SyntheticEvent<HTMLIFrameElement>) => {
    observer.current?.disconnect();
    const body = event.currentTarget.contentDocument?.body;
    if (!body) return;
    // The document can reflow again after fonts and emblems load or the window resizes.
    const measure = () => setHeight(Math.ceil(body.getBoundingClientRect().height));
    measure();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(body);
  };
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
      <iframe title={title} srcDoc={preview} sandbox="allow-same-origin" onLoad={observeHeight}
        className="block w-full border-0" style={{ height }} />
    </div>
  );
}
