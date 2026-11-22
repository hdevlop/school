'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, FileChartColumn, LifeBuoy, Printer, School, UserRound, Users } from 'lucide-react';
import type { CompetencyAssignment, CompetencyDomain, MassarGradeSource, MassarSheetDetail } from '@sms/contracts';
import { MASSAR_ANALYSIS_MAX_LENGTH } from '@sms/contracts';
import { schoolI18n, type SchoolTranslationKey } from '@sms/contracts/locales';
import { cn, DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, NButton, NEmptyState, NErrorState, NSkeleton, SelectInput } from 'najm-kit';
import { localDateInput } from 'najm-kit/format';
import { useTranslation } from 'najm-i18n/react';
import printStyles from '@/components/PrintMenu.module.css';
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
import { analyzeClass, classNote, classReport, supportCapacity, type ClassReport } from '../config/classReport';
import { classParts, type ClassPart } from '../config/partCounts';
import { useSheetParts } from '../hooks/useSheetParts';
import { PartCounts } from './PartCounts';
import { buildClassReportDocument, type ClassReportPrintOptions } from '../config/classReportDocument';
import { buildSupportListDocument, SUPPORT_LIST_SIZE } from '../config/supportListDocument';
import { monthLabel } from '../config/competencyLevels';
import { useListText } from './CompetencyText';
import type { SheetStudent } from './StudentCompetencySheet';

type ReportOptions = {
  assignment?: CompetencyAssignment;
  domains: CompetencyDomain[];
  /** The class roster, for each pupil's gender: the analysis agrees with it. */
  students: SheetStudent[];
  studentId?: string;
  /** The pupil last opened, marked in the class report's table. */
  highlightId?: string | null;
};

/**
 * تقارير التتبع of one class and subject after a Massar Contrôle, one A4 page
 * per pupil. The teacher picks the Contrôle for the selected pupil, reviews the report,
 * and prints it or the whole class's. The marks are the Massar grid's,
 * read through Notes' own permission, so a teacher reaches their own grids
 * only; an Arabic list's report reads in Arabic, with French captions.
 */
export function useFollowUpReport({ assignment, domains, students, studentId, highlightId = studentId }: ReportOptions) {
  const page = useTranslation();
  const { t, language, dir } = useListText(domains);
  const printOptions = useSchoolPrintOptions();
  const sources = useMassarRead<MassarGradeSource[]>('/sources', !!assignment, 0, NOTES_MASSAR_API);
  const sectionId = assignment?.sectionId;
  const subjectId = assignment?.subjectId;
  // The class and subject's Massar grids, one per Contrôle, in the year's order.
  const rounds = useMemo(() => {
    const seen = new Map<string, MassarGradeSource>();
    for (const source of sources.data ?? []) {
      if (source.sectionId === sectionId && source.subjectId === subjectId && !seen.has(source.sheetId)) seen.set(source.sheetId, source);
    }
    return [...seen.values()].sort((a, b) => a.term - b.term || a.exam - b.exam);
  }, [sources.data, sectionId, subjectId]);
  const [pickedRound, setRound] = useState('');
  const round = rounds.find((item) => item.sheetId === pickedRound) ?? rounds.at(-1);
  const sheet = useMassarRead<MassarSheetDetail>(`/sheets/${encodeURIComponent(round?.sheetId ?? '')}`, !!round, 0, NOTES_MASSAR_API);
  const analyses = useFollowUpAnalyses(round?.sheetId);
  const year = useCompetencyYearLevels(assignment?.teacherAssignmentId);
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
  const report = reports.find((item) => item.student.id === studentId);

  const documentOptions = useMemo<Omit<FollowUpPrintOptions, 'analysisOf'> | null>(() => {
    const detail = sheet.data;
    if (!detail || !assignment) return null;
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
  }, [sheet.data, printOptions, t, language, dir, assignment, remarkLanguage, genderOf]);
  const print = (chosen: readonly FollowUp[]) => {
    if (documentOptions) return printSchoolDocument(buildFollowUpDocument(chosen, { ...documentOptions, analysisOf }));
  };

  // تقرير القسم: the same pupils' reports, read as one class.
  const klass = useMemo(() => classReport(reports, sheet.data?.maxMark ?? 10), [reports, sheet.data]);
  const classOptions = useMemo<ClassReportPrintOptions | null>(() => {
    if (!documentOptions) return null;
    const labels = {
      language: remarkLanguage, maxMark: documentOptions.maxMark, levelLabel: rankLabel(t),
      appreciationLabel: (grade: string) => t(`competencies.report.appreciations.${grade}`),
      monthLabel: (month: string) => monthLabel(month, language),
    } as const;
    const { date } = printOptions({ title: '', date: localDateInput(new Date()), details: [], columns: [] });
    return { ...documentOptions, dateLabel: date, analysis: analyzeClass(klass, labels), note: classNote(klass, labels) };
  }, [documentOptions, klass, remarkLanguage, t, language, printOptions]);
  const printClass = () => {
    if (classOptions) return printSchoolDocument(buildClassReportDocument(klass, classOptions));
  };
  // لائحة الدعم: the pupils at Début or less on a competency, for the support sessions;
  // the teacher may keep only the ones who need it most.
  const [supportSize, setSupportSize] = useState(SUPPORT_LIST_SIZE);
  // Up to every pupil at En cours or less somewhere: fewer needing support are made up with them.
  const supportMax = useMemo(() => supportCapacity(klass), [klass]);
  const supportCount = Math.min(supportSize, supportMax);
  const printSupport = () => {
    if (classOptions) return printSchoolDocument(buildSupportListDocument(klass, classOptions, supportCount));
  };
  // How many pupils answered each question of the Contrôle's School test correctly: entered here,
  // kept apart from the report's page.
  const sheetParts = useSheetParts(round?.sheetId);
  const liveParts = classParts(sheetParts.parts, sheetParts.correctOf, klass.marked);
  const partOf = (part: ClassPart) => [part.testId, part.partId] as const;
  const partCounts = sheet.data?.canEdit === true || sheetParts.read.error ? (
    <PartCounts key={round?.sheetId} parts={liveParts} marked={klass.marked} t={page.t}
      statusOf={(part) => sheetParts.statusOf(...partOf(part))}
      onChange={(part, correct) => sheetParts.change(...partOf(part), correct)}
      onBlur={(part) => sheetParts.flush(...partOf(part))}
      onRetry={(part) => sheetParts.retry(...partOf(part))}
      error={!!sheetParts.read.error} loading={sheetParts.read.isLoading} onReload={() => void sheetParts.read.refetch()} />
  ) : null;

  const isLoading = sources.isLoading || (round && (sheet.isLoading || analyses.read.isLoading)) || year.isLoading;
  const loadError = sources.error || sheet.error || analyses.read.error;
  const canPrint = !!documentOptions && reports.length > 0 && !isLoading && !loadError && !year.error;
  // The states the pupil's report and the class's share: loading, a refused read, no Contrôle yet.
  let shared: ReactNode = null;
  if (isLoading) shared = <NSkeleton className="h-[60vh] rounded-xl" />;
  else if (loadError) shared = <NErrorState surface="panel" title={t('competencies.report.failed')} onRetry={() => {
    if (sources.error) void sources.refetch();
    if (sheet.error) void sheet.refetch();
    if (analyses.read.error) void analyses.read.refetch();
  }} />;
  else if (year.error) shared = <NErrorState surface="panel" onRetry={() => void year.refetch()} />;
  else if (!round) shared = <NEmptyState surface="panel" icon={FEATURE_ICONS.competencies} title={t('competencies.report.noRound')} />;
  let body: ReactNode;
  if (shared) body = shared;
  else if (!report) body = <NEmptyState surface="panel" icon={FEATURE_ICONS.competencies} title={t('competencies.report.noStudent')} />;
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

  const roundLabel = page.t('competencies.report.round');
  const roundChoices = rounds.map((item) => {
    const { examLabel, termLabel } = followUpRoundLabels(item, language, t);
    return { value: item.sheetId, label: `${examLabel} · ${termLabel}` };
  });
  const printLabel = page.t('insurance.print');
  const studentPrintLabel = report ? page.t('competencies.report.print', { name: report.student.name }) : undefined;
  const printMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NButton type="button" variant="outline" aria-label={printLabel} title={printLabel} disabled={!canPrint} className="shrink-0 max-md:size-11 max-md:p-0">
          <Printer aria-hidden="true" className="size-4 shrink-0" />
          <span className="hidden md:inline">{printLabel}</span>
          <ChevronDown aria-hidden="true" className="hidden size-4 shrink-0 md:block" />
        </NButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto max-w-[calc(100vw-24px)] p-0">
        <div className={printStyles.printMenu}>
          <DropdownMenuGroup className={printStyles.printColumn}>
            <DropdownMenuLabel className={printStyles.printTitle}>
              <FileChartColumn aria-hidden="true" />
              {page.t('competencies.report.title')}
            </DropdownMenuLabel>
            {report && (
              <>
                <DropdownMenuItem className={printStyles.printItem} onSelect={() => void print([report])}>
                  <UserRound aria-hidden="true" />
                  <span><strong title={studentPrintLabel}><bdi>{studentPrintLabel}</bdi></strong></span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem className={printStyles.printItem} onSelect={() => void print(reports)}>
              <Users aria-hidden="true" />
              <span><strong>{page.t('competencies.report.printAll', { count: reports.length })}</strong></span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className={printStyles.printItem} onSelect={() => void printClass()}>
              <School aria-hidden="true" />
              <span><strong>{page.t('competencies.classReport.title')}</strong></span>
            </DropdownMenuItem>
            <div className="flex items-center gap-1">
              <DropdownMenuItem className={cn(printStyles.printItem, 'min-w-0 flex-1')} onSelect={() => void printSupport()}>
                <LifeBuoy aria-hidden="true" />
                <span><strong>{page.t('competencies.supportList.print')}</strong></span>
              </DropdownMenuItem>
              {supportMax > 1 && (
                // How many of the pupils who need it most to keep; outside the item, so typing does not print.
                <label className="flex shrink-0 items-center gap-1 pe-2 text-xs text-muted-foreground" dir="ltr">
                  <input type="number" inputMode="numeric" min={1} max={supportMax} value={supportCount}
                    aria-label={page.t('competencies.supportList.choose')}
                    title={page.t('competencies.supportList.choose')}
                    className="h-8 w-12 rounded-md border border-input bg-background px-1 text-center text-sm text-foreground tabular-nums"
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      const value = Number(event.currentTarget.value);
                      if (Number.isInteger(value) && value >= 1) setSupportSize(value);
                    }} />
                  <span className="tabular-nums">/ {supportMax}</span>
                </label>
              )}
            </div>
          </DropdownMenuGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const roundPicker = round && (
    <SelectInput value={round.sheetId} onChange={setRound} className="w-full min-w-0 max-w-64" showIcon={false}
      items={roundChoices} placeholder={roundLabel} ariaLabel={roundLabel} />
  );
  const preview = (
    <div className="flex min-w-0 flex-col gap-2">
      {roundPicker}
      {body}
    </div>
  );
  // The page puts the Contrôle picker in its filters row, beside the class, section and subject.
  const classPreview = (
    <div className="flex min-w-0 flex-col gap-2">
      {shared ?? (!reports.length || !classOptions
        ? <NEmptyState surface="panel" icon={FEATURE_ICONS.competencies} title={t('competencies.classReport.empty')} />
        : <>
          {partCounts}
          <ClassPreview key={round?.sheetId} report={klass} options={classOptions} highlightId={highlightId ?? null}
            title={`${t('competencies.classReport.title')} · ${documentOptions?.className ?? ''}`} />
        </>)}
    </div>
  );

  return { preview, classPreview, printMenu, roundPicker };
}

/** The class report as it prints, reflowed to the page's width; its wide table scrolls on its own. */
function ClassPreview({ report, options, highlightId, title }: {
  report: ClassReport; options: ClassReportPrintOptions; highlightId: string | null; title: string;
}) {
  const observer = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(1100);
  const html = useMemo(() => buildClassReportDocument(report, { ...options, highlightId }, 'preview'), [report, options, highlightId]);
  useEffect(() => () => observer.current?.disconnect(), []);
  const mount = (event: SyntheticEvent<HTMLIFrameElement>) => {
    observer.current?.disconnect();
    const body = event.currentTarget.contentDocument?.body;
    if (!body) return;
    // The document reflows again once its fonts and emblems load, or the window resizes.
    const measure = () => setHeight(Math.ceil(body.getBoundingClientRect().height));
    measure();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(body);
  };
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
      <iframe title={title} srcDoc={html} sandbox="allow-same-origin" onLoad={mount} className="block w-full border-0" style={{ height }} />
    </div>
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
