'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Copy, FileChartColumn, ListTree, Search, SlidersHorizontal, TriangleAlert, Users } from 'lucide-react';
import { compareClassNames, type CompetencyAssignment, type CompetencyDomain, type CompetencyLevel } from '@sms/contracts';
import {
  cn, NajmScroll, NButton, NEmptyState, NErrorState, NPageHeaderActions, NSkeleton, SelectInput, Sheet, SheetContent, SheetHeader, SheetTitle, TextInput, useMediaQuery, useNPortalScope,
} from 'najm-kit';
import { localDateInput } from 'najm-kit/format';
import { useTranslation } from 'najm-i18n/react';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useViewingAcademicYear, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useStudents, useStudentsOnDate } from '@/features/Students/hooks/useStudents';
import { inMassarOrder } from '@/features/Students/config/massarRosterOrder';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { isCountUnknown } from '@/services/apiError';
import { competencyMonths, defaultMonth, indexEvaluations, monthLabel, rosterDay } from '../config/competencyLevels';
import {
  useCompetencyAssignments, useCompetencyCatalog, useCompetencyCatalogActions, useCompetencyEvaluations, useSaveCompetencyRemark, useSetCompetencyLevel, useStudentCompetencySheet,
} from '../hooks/useCompetencies';
import { CatalogEditor } from './CatalogEditor';
import { CompetencyOverview, CompetencyStudentList } from './CompetencyLists';
import { CompetencyRosterSheet } from './CompetencyRosterSheet';
import { CopyCatalogSheet } from './CopyCatalogSheet';
import { StudentCompetencySheet, type SheetStudent } from './StudentCompetencySheet';
import { CompetencyTextScope } from './CompetencyText';
import { FollowUpReports } from './FollowUpReports';

type View = 'competencies' | 'students';
const NO_DOMAINS: CompetencyDomain[] = [];
const WORKSPACE = 'mx-auto w-full min-w-0';

const ListSkeleton = ({ grid = false }: { grid?: boolean }) => (
  <div className={cn('grid gap-3', grid && '@xl:grid-cols-2 @5xl:grid-cols-3')} aria-busy="true">
    {Array.from({ length: 6 }, (_, index) => <NSkeleton key={index} className={cn('w-full rounded-xl', grid ? 'h-27' : 'h-16')} />)}
  </div>
);

function Filter({ value, onChange, items, label, disabled }: {
  value: string; onChange: (value: string) => void; items: Array<{ value: string; label: string }>; label: string; disabled?: boolean;
}) {
  return (
    <SelectInput value={value} onChange={onChange} items={items} placeholder={label} ariaLabel={label}
      disabled={disabled} showIcon={false} className="w-full min-w-0" />
  );
}

function ViewToggle({ view, onChange, compact = false }: { view: View; onChange: (view: View) => void; compact?: boolean }) {
  const { t } = useTranslation();
  const options: Array<{ value: View; label: string; Icon: typeof Users }> = [
    { value: 'students', label: t('competencies.views.byStudent'), Icon: Users },
    { value: 'competencies', label: t('competencies.views.byCompetency'), Icon: FEATURE_ICONS.competencies as typeof Users },
  ];
  return (
    <div role="group" className={cn('gap-0.5 rounded-lg bg-muted p-1', compact ? 'flex shrink-0' : 'grid grid-cols-2 @xl:flex')}>
      {options.map(({ value, label, Icon }) => (
        <button key={value} type="button" aria-pressed={view === value} onClick={() => onChange(value)}
          aria-label={compact ? label : undefined} title={compact ? label : undefined}
          className={cn('flex items-center justify-center gap-1.5 rounded-md text-sm font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            compact ? 'size-8' : 'min-h-9 px-2 py-1.5 @xl:px-3',
            view === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground')}>
          <Icon aria-hidden="true" className="size-4 shrink-0" />
          {compact ? null : label}
        </button>
      ))}
    </div>
  );
}

type FilterItems = Array<{ value: string; label: string }>;

/** Phones: the four filters as one line that opens them in a bottom sheet. */
function FilterChip({ parts, onOpen }: { parts: string[]; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-label={`${t('common.filters')}: ${parts.join(' · ')}`}
      className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/70 bg-card px-3 text-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <SlidersHorizontal aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span aria-hidden="true" className="min-w-0 flex-1 truncate text-start font-medium">
        {parts.map((part, index) => (
          <span key={index}>
            {index ? <span className="px-1 text-muted-foreground">·</span> : null}
            <bdi dir="auto">{part}</bdi>
          </span>
        ))}
      </span>
      <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function FilterSheet({ open, onClose, classId, onClass, classes, sectionId, onSection, sections, subjectId, onSubject, subjects, month, onMonth, months }: {
  open: boolean; onClose: () => void;
  classId: string; onClass: (value: string) => void; classes: FilterItems;
  sectionId: string; onSection: (value: string) => void; sections: FilterItems;
  subjectId: string; onSubject: (value: string) => void; subjects: FilterItems;
  month: string; onMonth: (value: string) => void; months: FilterItems;
}) {
  const { t } = useTranslation();
  const portal = useNPortalScope();
  const at = months.findIndex((item) => item.value === month);
  const step = (by: number) => { const next = months[at + by]; if (next) onMonth(next.value); };
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="bottom" portalClassName={portal} className="gap-0 rounded-t-2xl bg-background p-0 pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="border-b border-border/60 px-4 py-3">
          <SheetTitle className="text-base">{t('common.filters')}</SheetTitle>
        </SheetHeader>
        <div className="grid gap-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            <FilterField label={t('competencies.filters.class')}>
              <Filter value={classId} onChange={onClass} items={classes} label={t('competencies.filters.class')} disabled={!classes.length} />
            </FilterField>
            <FilterField label={t('competencies.filters.section')}>
              <Filter value={sectionId} onChange={onSection} items={sections} label={t('competencies.filters.section')} disabled={!sections.length} />
            </FilterField>
          </div>
          {subjects.length > 1 ? (
            <FilterField label={t('competencies.filters.subject')}>
              <Filter value={subjectId} onChange={onSubject} items={subjects} label={t('competencies.filters.subject')} />
            </FilterField>
          ) : null}
          <FilterField label={t('competencies.filters.month')}>
            <div className="flex items-center gap-2">
              <NButton type="button" size="icon" variant="outline" className="size-10 shrink-0" disabled={at <= 0}
                onClick={() => step(-1)} aria-label={t('common.previous')}>
                <ChevronLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
              </NButton>
              <div className="min-w-0 flex-1">
                <Filter value={month} onChange={onMonth} items={months} label={t('competencies.filters.month')} />
              </div>
              <NButton type="button" size="icon" variant="outline" className="size-10 shrink-0" disabled={at < 0 || at >= months.length - 1}
                onClick={() => step(1)} aria-label={t('common.next')}>
                <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
              </NButton>
            </div>
          </FilterField>
          <NButton type="button" className="mt-1 w-full" onClick={onClose}>{t('common.close')}</NButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SaveFailed({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
      <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">{t('competencies.save.failed')}</span>
      <NButton type="button" size="sm" variant="outline" onClick={onRetry}>{t('competencies.save.retry')}</NButton>
    </p>
  );
}

/** The month filter's choices, named in the page language. */
function useMonths() {
  const { language } = useTranslation();
  const { viewingYear } = useViewingAcademicYear();
  const today = localDateInput(new Date());
  const months = useMemo(() => competencyMonths(viewingYear), [viewingYear]);
  const items = useMemo(() => months.map((value) => ({ value, label: monthLabel(value, language) })), [months, language]);
  return { today, items, initial: defaultMonth(months, today) };
}

// ---------------------------------------------------------------------------
// Staff: a teacher's own classes, or the lists the reader may see.
// ---------------------------------------------------------------------------

function StaffCompetencies() {
  const { t, language } = useTranslation();
  const { can, role } = useViewerRole();
  const isTeacher = role === 'teacher';
  const months = useMonths();
  const [month, setMonth] = useState(months.initial);
  const [view, setView] = useState<View>('students');
  const desktop = useMediaQuery('(min-width: 1100px)');
  // Phones fold the filters into one line above the roster.
  const phone = useMediaQuery('(max-width: 767px)');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const splitRoster = desktop && view === 'students';
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [rosterCompetencyId, setRosterCompetencyId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const assignments = useCompetencyAssignments();
  // Each choice limits the next one to the available assignments.
  const classes = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of assignments.data) if (!seen.has(item.classId)) seen.set(item.classId, item.className);
    return [...seen]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => compareClassNames(left.label, right.label));
  }, [assignments.data]);
  const [pickedClass, setClassId] = useState('');
  const classId = classes.some((item) => item.value === pickedClass) ? pickedClass : classes[0]?.value ?? '';
  const sections = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of assignments.data) if (item.classId === classId && !seen.has(item.sectionId)) seen.set(item.sectionId, item.sectionName);
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [assignments.data, classId]);
  const [pickedSection, setSectionId] = useState('');
  const sectionId = sections.some((item) => item.value === pickedSection) ? pickedSection : sections[0]?.value ?? '';
  const subjects = useMemo(() => assignments.data
    .filter((item) => item.sectionId === sectionId)
    .map((item) => ({ value: item.subjectId, label: item.subjectName })), [assignments.data, sectionId]);
  const [pickedSubject, setSubjectId] = useState('');
  const subjectId = subjects.some((item) => item.value === pickedSubject) ? pickedSubject : subjects[0]?.value ?? '';
  const assignment: CompetencyAssignment | undefined = assignments.data
    .find((item) => item.sectionId === sectionId && item.subjectId === subjectId);
  const assignmentId = assignment?.teacherAssignmentId;

  const catalog = useCompetencyCatalog(assignmentId);
  const evaluations = useCompetencyEvaluations(assignmentId, month);
  const roster = useStudentsOnDate(rosterDay(month, months.today));
  // The section's pupils in Massar's order, as on the paper class list.
  const students: SheetStudent[] = useMemo(() => inMassarOrder(((roster.students as any[] | undefined) ?? [])
    .filter((student) => student.sectionId === sectionId))
    .map((student) => ({ id: student.id, name: student.name, altName: student.arabicName ?? null, image: student.image ?? null, gender: student.gender ?? null })),
  [roster.students, sectionId]);
  const studentIds = useMemo(() => students.map((student) => student.id), [students]);
  const domains = catalog.data;
  const competencyIds = useMemo(() => domains.flatMap((domain) => domain.competencies.map((item) => item.id)), [domains]);
  const index = useMemo(() => indexEvaluations(evaluations.data?.evaluations ?? []), [evaluations.data]);
  const baselineMonth = evaluations.data?.baselineMonth ?? month;

  const level = useSetCompetencyLevel();
  const remarks = useSaveCompetencyRemark();
  const catalogActions = useCompetencyCatalogActions();
  const [applyingDefault, setApplyingDefault] = useState(false);
  const applyDefault = async () => {
    if (!assignmentId) return;
    setApplyingDefault(true);
    try { await catalogActions.applyDefault(assignmentId); } catch { /* the hook said why */ } finally { setApplyingDefault(false); }
  };
  // The server still refuses a monitor or supervisor; their roles hold no update anyway.
  const editable = can('update:competencies');
  const canCreate = can('create:competencies');
  const setLevel = (competencyId: string, pupilId: string, next: CompetencyLevel | null) => {
    if (assignmentId) level.setLevel({ teacherAssignmentId: assignmentId, competencyId, studentId: pupilId, month, level: next });
  };

  const rosterUnknown = isCountUnknown(roster.error, roster.students as unknown[] | undefined, roster.isStudentsLoading);
  const subtitle = !assignment || rosterUnknown ? undefined
    : t('competencies.subtitle.pupils', { count: students.length });
  const query = search.trim().toLowerCase();
  const shown = query
    ? students.filter((student) => `${student.name} ${student.altName ?? ''}`.toLowerCase().includes(query))
    : students;
  const selected = view === 'students'
    ? shown.find((student) => student.id === studentId) ?? (splitRoster ? shown[0] : undefined)
    : undefined;
  const sheetOnly = !!selected && !splitRoster;
  const searchInput = (
    <TextInput value={search} onChange={setSearch} placeholder={t('competencies.filters.searchPlaceholder')} aria-label={t('competencies.filters.search')}
      icon={Search} className="w-full min-w-0 [&_input]:text-sm" />
  );
  const studentSheet = selected ? (
    <StudentCompetencySheet key={`${assignmentId}:${selected.id}:${month}`} student={selected} domains={domains} index={index} month={month} baselineMonth={baselineMonth}
      editable={editable} onSetLevel={(competencyId, next) => setLevel(competencyId, selected.id, next)}
      remark={evaluations.data?.remarks?.find((item) => item.studentId === selected.id && item.month === month)}
      onSaveRemark={editable && assignmentId
        ? (body) => remarks.save({ teacherAssignmentId: assignmentId, studentId: selected.id, month, body })
        : undefined} />
  ) : null;

  const menu: ReactNode = assignment ? (
    <>
      <NButton type="button" variant="ghost" onClick={() => setReportOpen(true)} leftIcon={<FileChartColumn className="size-4" />}>
        {t('competencies.report.open')}
      </NButton>
      {canCreate ? (
        <NButton type="button" variant="ghost" onClick={() => setEditorOpen(true)} leftIcon={<ListTree className="size-4" />}>
          {t('competencies.catalog.manage')}
        </NButton>
      ) : null}
      {canCreate && isTeacher && domains.length ? (
        <NButton type="button" variant="ghost" onClick={() => setCopyOpen(true)} leftIcon={<Copy className="size-4" />}>
          {t('competencies.catalog.copy')}
        </NButton>
      ) : null}
    </>
  ) : null;

  const filterSummary = [
    [classes.find((item) => item.value === classId)?.label, sections.find((item) => item.value === sectionId)?.label].filter(Boolean).join(' '),
    assignment?.subjectName,
    months.items.find((item) => item.value === month)?.label,
  ].filter((part): part is string => !!part);
  const showSearch = view === 'students' && domains.length > 0;
  // A new list starts at its top, so the folded search comes back with it.
  const closeSheet = () => { setStudentId(null); setScrolled(false); };
  const changeView = (next: View) => { setView(next); setScrolled(false); };
  // Folds only a roster long enough to stay scrollable once the search is gone, so the fold cannot bounce.
  const onListScroll = (_instance: unknown, event: Event) => {
    const viewport = event.target as HTMLElement;
    if (viewport.scrollHeight - viewport.clientHeight < 160) return;
    setScrolled((was) => (was ? viewport.scrollTop > 8 : viewport.scrollTop > 48));
  };

  let body: ReactNode;
  let desktopWorkspace: ReactNode;
  if (assignments.isLoading) body = <ListSkeleton grid={!phone && view === 'students'} />;
  else if (assignments.error) body = <NErrorState surface="panel" onRetry={() => void assignments.refetch()} />;
  else if (!assignments.data.length) {
    body = <NEmptyState surface="panel" icon={FEATURE_ICONS.competencies}
      title={isTeacher ? t('competencies.empty.noAssignment') : t('competencies.empty.noCatalogFamily')} />;
  } else if (catalog.isLoading || evaluations.isLoading || roster.isStudentsLoading) body = <ListSkeleton grid={!phone && !selected && view === 'students'} />;
  else if (catalog.error || evaluations.error || roster.error) {
    body = <NErrorState surface="panel" onRetry={() => { void catalog.refetch(); void evaluations.refetch(); }} />;
  } else if (!domains.length) {
    // A class and subject with a proposed list starts from it in one tap; the teacher edits it afterwards.
    const proposed = canCreate && !!assignment?.hasDefaultList;
    body = (
      <NEmptyState surface="panel" icon={FEATURE_ICONS.competencies} title={t('competencies.empty.noCatalogTitle')}
        description={proposed ? t('competencies.empty.defaultHint') : canCreate ? t('competencies.empty.noCatalog') : t('competencies.empty.noCatalogFamily')}
        action={canCreate ? (
          <div className="flex flex-wrap justify-center gap-2">
            {proposed ? (
              <NButton type="button" onClick={applyDefault} loading={applyingDefault} disabled={applyingDefault} leftIcon={<ListTree className="size-4" />}>
                {t('competencies.catalog.useDefault')}
              </NButton>
            ) : null}
            <NButton type="button" variant={proposed ? 'outline' : 'default'} disabled={applyingDefault} onClick={() => setEditorOpen(true)}>
              {t('competencies.catalog.addDomain')}
            </NButton>
          </div>
        ) : undefined} />
    );
  } else if (!students.length) {
    body = <NEmptyState surface="panel" icon={Users} title={t('competencies.empty.noStudents')} />;
  } else if (view === 'competencies') {
    body = <CompetencyOverview domains={domains} index={index} studentIds={studentIds} month={month} onOpen={setRosterCompetencyId} />;
  } else if (splitRoster) {
    desktopWorkspace = (
      <div className="grid min-h-0 flex-1 grid-cols-[clamp(16rem,24%,24rem)_minmax(0,1fr)] gap-2">
        <section aria-label={t('competencies.sheet.roster')} className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card">
          <div className="grid shrink-0 gap-2 border-b border-border/60 p-3">
            <h2 className="flex items-center justify-between gap-2 text-base font-semibold">
              {t('competencies.sheet.roster')}
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{shown.length}</span>
            </h2>
            {searchInput}
          </div>
          <NajmScroll axis="y" autoHide="scroll" className="min-h-0 flex-1">
            {selected ? (
              <CompetencyTextScope domains={domains}>
                <CompetencyStudentList students={shown} activeId={selected.id} index={index} competencyIds={competencyIds} month={month} onOpen={setStudentId} />
              </CompetencyTextScope>
            ) : null}
          </NajmScroll>
        </section>
        <NajmScroll key={selected?.id} axis="y" autoHide="scroll" className="min-h-0 min-w-0">
          {studentSheet ? (
            <CompetencyTextScope domains={domains} className="min-w-0 pb-4">{studentSheet}</CompetencyTextScope>
          ) : <NEmptyState surface="panel" icon={Search} title={t('competencies.empty.noMatch')} />}
        </NajmScroll>
      </div>
    );
  } else if (selected) {
    body = studentSheet;
  } else {
    body = shown.length
      ? <CompetencyStudentList mobile={phone} students={shown} index={index} competencyIds={competencyIds} month={month} onOpen={setStudentId} />
      : <NEmptyState surface="panel" icon={Search} title={t('competencies.empty.noMatch')} />;
  }

  // The follow-up reports after a Massar Contrôle, in place of the page.
  if (reportOpen && assignment) {
    return (
      <FollowUpReports assignment={assignment} domains={domains} students={students} onBack={() => setReportOpen(false)} />
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      {/* One header for the list and a pupil's sheet: the sheet's back arrow returns to the list, its menu stays. */}
      {sheetOnly ? (
        <NPageHeader icon={FEATURE_ICONS.competencies} title={t('competencies.sheet.title')}
          subtitle={`${monthLabel(month, language)}${assignment ? ` · ${assignment.subjectName}` : ''}`}
          onBack={closeSheet} backLabel={t('competencies.sheet.back')}>
          <NPageHeaderActions>
            {/* Phones go back with the header's arrow; wider screens have no arrow. */}
            <NButton type="button" variant="outline" className="max-md:hidden" onClick={closeSheet}
              leftIcon={<ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />}>
              {t('competencies.sheet.back')}
            </NButton>
            {menu}
            <PageHeaderGlobalActions />
          </NPageHeaderActions>
        </NPageHeader>
      ) : (
        <NPageHeader icon={FEATURE_ICONS.competencies} title={t('competencies.title')} subtitle={desktopWorkspace ? undefined : subtitle}>
          <NPageHeaderActions>
            {menu}
            <PageHeaderGlobalActions />
          </NPageHeaderActions>
        </NPageHeader>
      )}

      {sheetOnly ? null : phone ? (
        <section aria-label={t('common.table.filterRegion')} className="shrink-0">
          <div className="flex items-center gap-2">
            <FilterChip parts={filterSummary} onOpen={() => setFiltersOpen(true)} />
            <ViewToggle compact view={view} onChange={changeView} />
          </div>
          {showSearch ? (
            // Scrolling down the roster folds the search away; scrolling back up, or a query, brings it back.
            <div className={cn('grid transition-[grid-template-rows,opacity] duration-200 ease-out',
              scrolled && !search ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100')}>
              <div className="min-h-0 overflow-hidden"><div className="pt-2">{searchInput}</div></div>
            </div>
          ) : null}
        </section>
      ) : (
        <div className={cn(WORKSPACE, '@container shrink-0')}>
          {/* One bare row, as Attendance and Grades lay out their filters: phones two per row, desktop one line with the view toggle at its end. */}
          <section aria-label={t('common.table.filterRegion')} className="grid grid-cols-2 items-center gap-2 lg:flex lg:flex-wrap">
            <div className="min-w-0 lg:w-48">
              <Filter value={classId} onChange={setClassId} items={classes} label={t('competencies.filters.class')} disabled={!classes.length} />
            </div>
            <div className="min-w-0 lg:w-48">
              <Filter value={sectionId} onChange={setSectionId} items={sections} label={t('competencies.filters.section')} disabled={!sections.length} />
            </div>
            <div className="min-w-0 lg:w-48">
              {subjects.length === 1 ? (
                <div className="flex min-h-10 min-w-0 items-center rounded-lg bg-muted/60 px-3 text-sm font-medium"
                  title={`${t('competencies.filters.subject')} · ${subjects[0].label}`}>
                  <bdi dir="auto" className="truncate">{subjects[0].label}</bdi>
                </div>
              ) : (
                <Filter value={subjectId} onChange={setSubjectId} items={subjects} label={t('competencies.filters.subject')} disabled={!subjects.length} />
              )}
            </div>
            <div className="min-w-0 lg:w-48">
              <Filter value={month} onChange={setMonth} items={months.items} label={t('competencies.filters.month')} />
            </div>
            {!desktop && view === 'students' && domains.length ? <div className="col-span-2 min-w-0 lg:w-72">{searchInput}</div> : null}
            <div className="col-span-2 lg:ms-auto">
              <ViewToggle view={view} onChange={setView} />
            </div>
          </section>
        </div>
      )}

      {level.failed ? (
        <div className={cn(WORKSPACE, sheetOnly && 'max-w-3xl')}><SaveFailed onRetry={level.retry} /></div>
      ) : null}

      {desktopWorkspace ?? <NajmScroll axis="y" autoHide="scroll" className="min-h-0 flex-1" events={phone ? { scroll: onListScroll } : undefined}>
        <CompetencyTextScope domains={domains} className={cn(WORKSPACE, '@container pb-6', sheetOnly && 'max-w-3xl')}>
          {body}
        </CompetencyTextScope>
      </NajmScroll>}

      {phone ? (
        <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)}
          classId={classId} onClass={setClassId} classes={classes}
          sectionId={sectionId} onSection={setSectionId} sections={sections}
          subjectId={subjectId} onSubject={setSubjectId} subjects={subjects}
          month={month} onMonth={setMonth} months={months.items} />
      ) : null}
      <CompetencyRosterSheet competencyId={rosterCompetencyId} domains={domains} students={students} index={index} month={month}
        editable={editable} onSetLevel={setLevel} onClose={() => setRosterCompetencyId(null)} />
      {assignment && editorOpen ? (
        <CatalogEditor open={editorOpen} onClose={() => setEditorOpen(false)} teacherAssignmentId={assignment.teacherAssignmentId}
          domains={domains} canCreate={canCreate} canUpdate={can('update:competencies')} canDelete={can('delete:competencies')} />
      ) : null}
      {assignment && copyOpen ? (
        <CopyCatalogSheet open={copyOpen} onClose={() => setCopyOpen(false)} from={assignment} assignments={assignments.data}
          onCopied={(target) => {
            const copied = assignments.data.find((item) => item.teacherAssignmentId === target);
            if (copied) { setClassId(copied.classId); setSectionId(copied.sectionId); setSubjectId(copied.subjectId); }
          }} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Families: a parent's children, or the pupil themselves, read-only.
// ---------------------------------------------------------------------------

function FamilyCompetencies() {
  const { t, language } = useTranslation();
  const months = useMonths();
  const [month, setMonth] = useState(months.initial);
  const [pickedChild, setChildId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const { students, isStudentsLoading, error } = useStudents();
  const children = useMemo(() => ((students as any[] | undefined) ?? [])
    .map((student) => ({ value: student.id as string, label: student.name as string })), [students]);
  const childId = children.some((item) => item.value === pickedChild) ? pickedChild : children[0]?.value ?? '';
  const sheet = useStudentCompetencySheet(childId || undefined, month, subjectId || undefined);
  const data = sheet.data;
  const index = useMemo(() => indexEvaluations(data?.evaluations ?? []), [data]);
  const subjects = (data?.subjects ?? []).map((item) => ({ value: item.id, label: item.name }));

  let body: ReactNode;
  if (isStudentsLoading || (childId && sheet.isLoading)) body = <ListSkeleton />;
  else if (error) body = <NErrorState surface="panel" />;
  else if (!children.length) body = <NEmptyState surface="panel" icon={Users} title={t('competencies.empty.noChildren')} />;
  else if (sheet.error) body = <NErrorState surface="panel" onRetry={() => void sheet.refetch()} />;
  else if (!data?.domains.length) {
    body = <NEmptyState surface="panel" icon={FEATURE_ICONS.competencies} title={t('competencies.empty.noCatalogTitle')}
      description={t('competencies.empty.noCatalogFamily')} />;
  } else {
    body = (
      <StudentCompetencySheet student={data.student} domains={data.domains} index={index} month={data.month} baselineMonth={data.baselineMonth}
        remark={data.remarks?.find((item) => item.month === data.month)} />
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <NPageHeader icon={FEATURE_ICONS.competencies} title={t('competencies.title')}
        subtitle={data?.subject ? `${monthLabel(month, language)} · ${data.subject.name}` : monthLabel(month, language)}>
        <NPageHeaderActions><PageHeaderGlobalActions /></NPageHeaderActions>
      </NPageHeader>
      <div className={cn('grid shrink-0 gap-2 lg:flex lg:[&>*]:w-56', children.length > 1 ? 'grid-cols-3' : 'grid-cols-2')}>
        {children.length > 1 ? (
          <Filter value={childId} onChange={(value) => { setChildId(value); setSubjectId(''); }} items={children} label={t('competencies.filters.child')} />
        ) : null}
        <Filter value={data?.subject?.id ?? subjectId} onChange={setSubjectId} items={subjects} label={t('competencies.filters.subject')} disabled={!subjects.length} />
        <Filter value={month} onChange={setMonth} items={months.items} label={t('competencies.filters.month')} />
      </div>
      <NajmScroll axis="y" autoHide="scroll" className="min-h-0 flex-1">
        <CompetencyTextScope domains={data?.domains ?? NO_DOMAINS} className="mx-auto flex w-full max-w-3xl flex-col pb-6 min-[1100px]:max-w-none">{body}</CompetencyTextScope>
      </NajmScroll>
    </div>
  );
}

export default function CompetenciesPage() {
  const { isFamily } = useViewerRole();
  const yearKey = useViewingYearKey();
  // A new viewing year starts the page over: its months, lists and pupils.
  return isFamily ? <FamilyCompetencies key={yearKey} /> : <StaffCompetencies key={yearKey} />;
}
