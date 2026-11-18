'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Files, Printer, Search } from 'lucide-react';
import type { CompetencyAssignment, CompetencyDomain, MassarGradeSource, MassarSheetDetail } from '@sms/contracts';
import { MASSAR_ANALYSIS_MAX_LENGTH } from '@sms/contracts';
import { schoolI18n, type SchoolTranslationKey } from '@sms/contracts/locales';
import { cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, NajmScroll, NButton, NEmptyState, NErrorState, NFullscreenToggle, NPageHeaderActions, NPageHeaderFilters, NSkeleton, SelectInput, TextInput, useMediaQuery } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useSchoolPrintOptions } from '@/hooks/useSchoolPrintOptions';
import { printSchoolDocument } from '@/shared/schoolPrintDocument';
import { useMassarRead } from '@/features/Massar/hooks/useMassar';
import { NOTES_MASSAR_API } from '@/features/Grades/hooks/useMassarGrades';
import { useCompetencyYearLevels } from '../hooks/useCompetencies';
import { useFollowUpAnalyses } from '../hooks/useFollowUpAnalyses';
import { followUps, isRoomy, type FollowUp } from '../config/followUpReport';
import { skillNeed } from '../config/competencyRemarks';
import { analyze, comparableClassMean, rankLabel } from '../config/followUpAnalysis';
import { buildFollowUpDocument, followUpRoundLabels, type FollowUpPrintOptions } from '../config/followUpDocument';
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
  const analyses = useFollowUpAnalyses(round?.sheetId);
  const year = useCompetencyYearLevels(assignment.teacherAssignmentId);
  const reports = useMemo(() => (sheet.data && year.data ? followUps({
    sheet: sheet.data, domains, evaluations: year.data.evaluations, remarks: year.data.remarks, months: year.data.months,
  }) : []), [sheet.data, year.data, domains]);
  // Suggestions are the fallback for reports without a saved analysis.
  const remarkLanguage = language === 'ar' ? 'ar' : 'fr';
  const genderOf = useMemo(() => new Map(students.map((student) => [student.id, (student.gender ?? null) as 'M' | 'F' | null])), [students]);
  const generated = useMemo(() => {
    const maxMark = sheet.data?.maxMark ?? 10;
    const classComparison = comparableClassMean(reports);
    // A short report lists the areas to improve in its own section: the analysis does not repeat them.
    return new Map(reports.map((item) => [item.student.id, analyze(item, {
      maxMark, language: remarkLanguage, gender: genderOf.get(item.student.id) ?? null, levelLabel: rankLabel(t), classComparison, priorities: !isRoomy(item),
    })]));
  }, [reports, genderOf, sheet.data, remarkLanguage, t]);
  const analysisOf = (item: FollowUp) => analyses.entry(item.student.id).value ?? generated.get(item.student.id) ?? '';
  const [pickedPupil, setPupil] = useState('');
  const index = Math.max(0, reports.findIndex((report) => report.student.id === pickedPupil));
  const report = reports[index];

  const documentOptions = useMemo<Omit<FollowUpPrintOptions, 'analysisOf'> | null>(() => {
    const detail = sheet.data;
    if (!detail) return null;
    const { school, assetOrigin } = printOptions({ title: t('competencies.report.title'), date: '', details: [], columns: [] });
    // Small captions in the other language of the school: French under Arabic, Arabic under French.
    const second = language === 'ar' ? 'fr' : language === 'fr' ? 'ar' : null;
    return {
      language, dir, t,
      caption: second ? (key, params) => schoolI18n.translate(second, key as SchoolTranslationKey, params) : null,
      school: { name: detail.schoolName || school.name, logo: school.logo }, assetOrigin,
      subjectName: assignment.subjectName, className: detail.sheet.className, levelLabel: detail.levelLabel,
      ...followUpRoundLabels(detail.round, language, t), yearLabel: detail.yearLabel,
      teacherName: detail.sheet.teacherName ?? assignment.teacherName ?? null, maxMark: detail.maxMark,
      needOf: (item, name, level) => skillNeed(remarkLanguage, name, genderOf.get(item.student.id) ?? null, level),
    };
  }, [sheet.data, printOptions, t, language, dir, assignment.subjectName, assignment.teacherName, remarkLanguage, genderOf]);
  const print = (chosen: readonly FollowUp[]) => {
    if (documentOptions) return printSchoolDocument(buildFollowUpDocument(chosen, { ...documentOptions, analysisOf }));
  };

  const isLoading = sources.isLoading || (round && (sheet.isLoading || analyses.read.isLoading)) || year.isLoading;
  const loadError = sources.error || sheet.error || analyses.read.error;
  const hasReport = !!report && !isLoading && !loadError && !year.error;
  let body: ReactNode;
  if (isLoading) body = <NSkeleton className="h-[60vh] rounded-xl" />;
  else if (loadError) body = <NErrorState surface="panel" title={t('competencies.report.failed')} onRetry={() => {
    if (sources.error) void sources.refetch();
    if (sheet.error) void sheet.refetch();
    if (analyses.read.error) void analyses.read.refetch();
  }} />;
  else if (year.error) body = <NErrorState surface="panel" onRetry={() => void year.refetch()} />;
  else if (!round) body = <NEmptyState surface="panel" icon={FEATURE_ICONS.competencies} title={t('competencies.report.noRound')} />;
  else if (!report) body = <NEmptyState surface="panel" icon={FEATURE_ICONS.competencies} title={t('competencies.empty.noStudents')} />;
  else if (documentOptions) {
    const studentId = report.student.id;
    const editable = sheet.data?.canEdit === true;
    const { value, status } = analyses.entry(studentId);
    body = (
      <PagePreview key={`${round.sheetId}:${studentId}`} report={report} options={documentOptions} analysis={analysisOf(report)}
        title={`${t('competencies.report.title')} · ${report.student.name}`}
        onChange={editable ? (text) => analyses.change(studentId, text) : undefined}
        onBlur={() => analyses.flush(studentId)}
        onReset={editable && value != null ? () => analyses.change(studentId, null, true) : undefined}
        status={status} onRetry={() => analyses.retry(studentId)} />
    );
  }

  const step = (by: number) => { const next = reports[index + by]; if (next) setPupil(next.student.id); };
  const pupils = useMemo(() => {
    const roster = new Map(students.map((student) => [student.id, student]));
    return reports.map((item): SheetStudent => roster.get(item.student.id) ?? { id: item.student.id, name: item.student.name });
  }, [reports, students]);

  const reportArea = (
    <CompetencyTextScope domains={domains} className="@container flex min-w-0 flex-col gap-2 pb-6">{body}</CompetencyTextScope>
  );
  const roundLabel = page.t('competencies.report.round');
  const roundChoices = rounds.map((item) => {
    const { examLabel, termLabel } = followUpRoundLabels(item, language, t);
    return { value: item.sheetId, label: `${examLabel} · ${termLabel}` };
  });
  const selectedRoundLabel = roundChoices.find((item) => item.value === round?.sheetId)?.label;
  const selectRound = (value: string) => { setRound(value); setPupil(''); };
  const roundSelector = round ? (
    <SelectInput value={round.sheetId} onChange={selectRound} className="w-full min-w-0" showIcon={false}
      items={roundChoices} placeholder={roundLabel} ariaLabel={roundLabel} />
  ) : null;
  const compactRoundSelector = round ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NButton type="button" variant="outline" size="icon" className="size-11"
          aria-label={selectedRoundLabel ? `${roundLabel} · ${selectedRoundLabel}` : roundLabel} title={roundLabel}>
          <CalendarDays aria-hidden="true" className="size-4" />
        </NButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
        <DropdownMenuRadioGroup value={round.sheetId} onValueChange={selectRound}>
          {roundChoices.map(({ value, label }) => (
            <DropdownMenuRadioItem key={value} value={value}><bdi>{label}</bdi></DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;
  const printLabel = page.t('insurance.print');
  const printMenu = hasReport ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NButton type="button" aria-label={printLabel} title={printLabel} className="max-md:size-11 max-md:p-0">
          <Printer aria-hidden="true" className="size-4 shrink-0" />
          <span className="hidden md:inline">{printLabel}</span>
          <ChevronDown aria-hidden="true" className="hidden size-4 shrink-0 md:block" />
        </NButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void print([report])}>
          <Printer aria-hidden="true" className="size-4 shrink-0" />
          {page.t('competencies.report.print')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void print(reports)}>
          <Files aria-hidden="true" className="size-4 shrink-0" />
          {page.t('competencies.report.printAll', { count: reports.length })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader icon={FEATURE_ICONS.competencies} title={page.t('competencies.report.open')}
        subtitle={`${assignment.className} · ${assignment.sectionName} · ${assignment.subjectName}`}
        onBack={onBack} backLabel={page.t('competencies.sheet.back')}
        compactActions={<div className="flex items-center gap-1">{compactRoundSelector}{printMenu}</div>}>
        <NPageHeaderActions>
          {roundSelector ? <div className="hidden w-56 shrink-0 xl:block">{roundSelector}</div> : null}
          <NButton type="button" variant="outline" onClick={onBack} leftIcon={<ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />}>
            {page.t('competencies.sheet.back')}
          </NButton>
          {printMenu}
          <NFullscreenToggle label={page.t('common.toggleFullscreen')} hiddenBelow="md" />
        </NPageHeaderActions>
        {roundSelector ? (
          <NPageHeaderFilters className="hidden px-2 pb-2 pt-0 md:block xl:hidden">
            <div className="max-w-64">{roundSelector}</div>
          </NPageHeaderFilters>
        ) : null}
      </NPageHeader>

      {round && !wide ? (
        <section aria-label={page.t('common.table.filterRegion')} className="flex min-w-0 shrink-0 items-center gap-1.5 lg:w-96">
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
        </section>
      ) : null}

      {wide && hasReport ? (
        <div className="grid min-h-0 flex-1 grid-cols-[clamp(16rem,24%,24rem)_minmax(0,1fr)] gap-2">
          <ReportRoster pupils={pupils} selectedId={report.student.id} onSelect={setPupil} />
          <NajmScroll key={report.student.id} axis="y" autoHide="scroll" className="min-h-0 min-w-0">{reportArea}</NajmScroll>
        </div>
      ) : (
        <NajmScroll axis="y" autoHide="scroll" className="min-h-0 flex-1">{reportArea}</NajmScroll>
      )}
    </div>
  );
}

function ReportRoster({ pupils, selectedId, onSelect }: { pupils: SheetStudent[]; selectedId: string; onSelect: (id: string) => void }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const shown = query ? pupils.filter((pupil) => `${pupil.name} ${pupil.altName ?? ''}`.toLowerCase().includes(query)) : pupils;
  return (
    <section aria-label={t('competencies.sheet.roster')} className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="grid shrink-0 gap-2 border-b border-border/60 p-3">
        <h2 className="flex items-center justify-between gap-2 text-base font-semibold">
          {t('competencies.sheet.roster')}
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{shown.length}</span>
        </h2>
        <TextInput value={search} onChange={setSearch} placeholder={t('competencies.filters.searchPlaceholder')} aria-label={t('competencies.filters.search')}
          icon={Search} className="w-full min-w-0 [&_input]:text-sm" />
      </div>
      <NajmScroll axis="y" autoHide="scroll" className="min-h-0 flex-1">
        {shown.length ? (
          <ul role="list" className="divide-y divide-border/50">
            {shown.map((pupil) => {
              const active = pupil.id === selectedId;
              return (
                <li key={pupil.id}>
                  <button type="button" aria-current={active ? 'true' : undefined} onClick={() => onSelect(pupil.id)}
                    className={cn('flex w-full items-center gap-2 border-s-[3px] px-3 py-2.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      active ? 'border-s-primary bg-primary/[0.07]' : 'border-s-transparent hover:bg-muted/60')}>
                    <StudentIdentity student={pupil} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <p className="p-4 text-center text-sm text-muted-foreground">{t('competencies.empty.noMatch')}</p>}
      </NajmScroll>
    </section>
  );
}

function PagePreview({ report, options, analysis, title, onChange, onBlur, onReset, status, onRetry }: {
  report: FollowUp; options: Omit<FollowUpPrintOptions, 'analysisOf'>; analysis: string; title: string;
  onChange?: (value: string) => void;
  onBlur: () => void;
  onReset?: () => void;
  status?: 'saving' | 'saved' | 'failed';
  onRetry: () => void;
}) {
  const observer = useRef<ResizeObserver | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [editor, setEditor] = useState<{ box: HTMLElement; status: HTMLElement | null; actions: HTMLElement | null } | null>(null);
  const [height, setHeight] = useState(900);
  const editable = !!onChange;
  const readOnlyText = editable ? '' : analysis;
  // The portal updates the editor without replacing the iframe document on each keystroke.
  const preview = useMemo(() => buildFollowUpDocument([report], {
    ...options, analysisOf: () => readOnlyText, editableAnalysis: editable,
  }, 'preview'), [report, options, readOnlyText, editable]);
  useEffect(() => () => observer.current?.disconnect(), []);

  const mountPreview = (event: SyntheticEvent<HTMLIFrameElement>) => {
    observer.current?.disconnect();
    const doc = event.currentTarget.contentDocument;
    const box = doc?.querySelector<HTMLElement>('[data-analysis-editor]');
    setEditor(box ? {
      box,
      status: doc!.querySelector<HTMLElement>('[data-analysis-status]'),
      actions: doc!.querySelector<HTMLElement>('[data-analysis-actions]'),
    } : null);
    const body = doc?.body;
    if (!body) return;
    // The document can reflow again after fonts and emblems load or the window resizes.
    const measure = () => setHeight(Math.ceil(body.getBoundingClientRect().height));
    measure();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(body);
  };
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
      <iframe title={title} srcDoc={preview} sandbox="allow-same-origin" onLoad={mountPreview}
        className="block w-full border-0" style={{ height }} />
      {editor && onChange && createPortal(
        <div className="analysis-editor">
          <textarea ref={textarea} rows={8} value={analysis} dir={options.dir} maxLength={MASSAR_ANALYSIS_MAX_LENGTH}
            aria-label={options.t('competencies.report.analysis')} aria-describedby="analysis-editor-hint"
            onChange={(event) => onChange(event.currentTarget.value)} onBlur={onBlur} />
        </div>, editor.box,
      )}
      {/* The save status sits beside the section title, the actions at the end of its row: nothing under the box. */}
      {editor?.status && onChange && createPortal(
        <span id="analysis-editor-hint" role="status" className={cn('analysis-status', status)}>
          {status === 'saving' ? options.t('competencies.remark.saving')
            : status === 'saved' ? `✓ ${options.t('competencies.remark.saved')}`
              : status === 'failed' ? options.t('competencies.report.analysisSaveFailed')
                : options.t('competencies.report.analysisHint')}
        </span>, editor.status,
      )}
      {editor?.actions && onChange && createPortal(
        <span className="analysis-actions">
          {status === 'failed' && <button type="button" className="retry" onClick={onRetry}>{options.t('competencies.save.retry')}</button>}
          {onReset && <button type="button" onClick={() => { onReset(); textarea.current?.focus(); }}>
            ↺ {options.t('competencies.report.analysisReset')}
          </button>}
        </span>, editor.actions,
      )}
    </div>
  );
}
