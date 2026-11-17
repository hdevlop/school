'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Copy, ListTree, Search, TriangleAlert, Users } from 'lucide-react';
import type { CompetencyAssignment, CompetencyDomain, CompetencyLevel } from '@sms/contracts';
import { cn, NajmScroll, NButton, NEmptyState, NErrorState, NPageHeaderActions, NSkeleton, SelectInput, TextInput } from 'najm-kit';
import { localDateInput } from 'najm-kit/format';
import { useTranslation } from 'najm-i18n/react';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { HeaderActionsMenu } from '@/components/HeaderActionsMenu';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useViewingAcademicYear, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useStudents, useStudentsOnDate } from '@/features/Students/hooks/useStudents';
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

type View = 'competencies' | 'students';
const NO_DOMAINS: CompetencyDomain[] = [];

const ListSkeleton = () => (
  <div className="flex flex-col gap-2" aria-busy="true">
    {Array.from({ length: 5 }, (_, index) => <NSkeleton key={index} className="h-16 w-full rounded-xl" />)}
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

/** The two views of mockups 1 and 2, as icons that stay in the phone header: by pupil first, the page's default. */
function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const { t } = useTranslation();
  const options: Array<{ value: View; label: string; Icon: typeof Users }> = [
    { value: 'students', label: t('competencies.views.byStudent'), Icon: Users },
    { value: 'competencies', label: t('competencies.views.byCompetency'), Icon: FEATURE_ICONS.competencies as typeof Users },
  ];
  return (
    <div role="group" className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map(({ value, label, Icon }) => (
        <button key={value} type="button" aria-pressed={view === value} aria-label={label} title={label} onClick={() => onChange(value)}
          className={cn('flex size-9 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            view === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
          <Icon aria-hidden="true" className="size-4" />
        </button>
      ))}
    </div>
  );
}

/** The pupil sheet's own bar (mockup 3): back to the list, the month and subject under the title. */
function SheetBar({ subtitle, onBack }: { subtitle: string; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-2">
      <NButton type="button" size="icon" variant="ghost" className="size-10" onClick={onBack} aria-label={t('competencies.sheet.back')}>
        <ArrowLeft aria-hidden="true" className="size-5 rtl:rotate-180" />
      </NButton>
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold">{t('competencies.sheet.title')}</h2>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
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
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [rosterCompetencyId, setRosterCompetencyId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const assignments = useCompetencyAssignments();
  // Class, then its sections, then the subjects taught there: a teacher of one
  // subject never sees the subject filter, it is in the subtitle.
  const classes = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of assignments.data) if (!seen.has(item.classId)) seen.set(item.classId, item.className);
    return [...seen].map(([value, label]) => ({ value, label }));
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
  const students: SheetStudent[] = useMemo(() => ((roster.students as any[] | undefined) ?? [])
    .filter((student) => student.sectionId === sectionId)
    .map((student) => ({ id: student.id, name: student.name, altName: student.arabicName ?? null, image: student.image ?? null, gender: student.gender ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, language)), [roster.students, sectionId, language]);
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
    : t('competencies.subtitle.withSubject', { count: students.length, subject: assignment.subjectName });
  const selected = students.find((student) => student.id === studentId);
  const query = search.trim().toLowerCase();
  const shown = query
    ? students.filter((student) => `${student.name} ${student.altName ?? ''}`.toLowerCase().includes(query))
    : students;

  const menu: ReactNode = assignment && canCreate ? (
    <>
      <NButton type="button" variant="ghost" onClick={() => setEditorOpen(true)} leftIcon={<ListTree className="size-4" />}>
        {t('competencies.catalog.manage')}
      </NButton>
      {isTeacher && domains.length ? (
        <NButton type="button" variant="ghost" onClick={() => setCopyOpen(true)} leftIcon={<Copy className="size-4" />}>
          {t('competencies.catalog.copy')}
        </NButton>
      ) : null}
    </>
  ) : null;

  let body: ReactNode;
  if (assignments.isLoading) body = <ListSkeleton />;
  else if (assignments.error) body = <NErrorState surface="panel" onRetry={() => void assignments.refetch()} />;
  else if (!assignments.data.length) {
    body = <NEmptyState surface="panel" icon={FEATURE_ICONS.competencies}
      title={isTeacher ? t('competencies.empty.noAssignment') : t('competencies.empty.noCatalogFamily')} />;
  } else if (catalog.isLoading || evaluations.isLoading || roster.isStudentsLoading) body = <ListSkeleton />;
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
  } else if (selected) {
    body = (
      <StudentCompetencySheet student={selected} domains={domains} index={index} month={month} baselineMonth={baselineMonth}
        editable={editable} onSetLevel={(competencyId, next) => setLevel(competencyId, selected.id, next)}
        remark={evaluations.data?.remarks?.find((item) => item.studentId === selected.id && item.month === month)}
        onSaveRemark={editable && assignmentId
          ? (body) => remarks.save({ teacherAssignmentId: assignmentId, studentId: selected.id, month, body })
          : undefined} />
    );
  } else if (!students.length) {
    body = <NEmptyState surface="panel" icon={Users} title={t('competencies.empty.noStudents')} />;
  } else if (view === 'competencies') {
    body = <CompetencyOverview domains={domains} index={index} studentIds={studentIds} month={month} onOpen={setRosterCompetencyId} />;
  } else {
    body = shown.length
      ? <CompetencyStudentList students={shown} index={index} competencyIds={competencyIds} month={month} onOpen={setStudentId} />
      : <NEmptyState surface="panel" icon={Search} title={t('competencies.empty.noMatch')} />;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      {selected ? (
        <SheetBar subtitle={`${monthLabel(month, language)}${assignment ? ` · ${assignment.subjectName}` : ''}`} onBack={() => setStudentId(null)} />
      ) : (
        <NPageHeader
          icon={FEATURE_ICONS.competencies}
          title={t('competencies.title')}
          subtitle={subtitle}
          compactActions={(
            <div className="flex items-center gap-1">
              <ViewToggle view={view} onChange={setView} />
              <HeaderActionsMenu contentClassName="md:hidden" hasOwnActions={!!menu}>{menu}</HeaderActionsMenu>
            </div>
          )}
        >
          <NPageHeaderActions>
            <ViewToggle view={view} onChange={setView} />
            {menu}
            <PageHeaderGlobalActions />
          </NPageHeaderActions>
        </NPageHeader>
      )}

      {selected ? null : (
        <div className={cn('grid shrink-0 gap-2 lg:flex lg:[&>*]:w-56', subjects.length > 1 ? 'grid-cols-2' : 'grid-cols-3')}>
          <Filter value={classId} onChange={(value) => { setClassId(value); setStudentId(null); }} items={classes} label={t('competencies.filters.class')} disabled={!classes.length} />
          <Filter value={sectionId} onChange={(value) => { setSectionId(value); setStudentId(null); }} items={sections} label={t('competencies.filters.section')} disabled={!sections.length} />
          {subjects.length > 1 ? (
            <Filter value={subjectId} onChange={setSubjectId} items={subjects} label={t('competencies.filters.subject')} />
          ) : null}
          <Filter value={month} onChange={setMonth} items={months.items} label={t('competencies.filters.month')} />
          {view === 'students' && domains.length ? (
            <div className="col-span-full lg:w-72">
              <TextInput value={search} onChange={setSearch} placeholder={t('competencies.filters.search')} aria-label={t('competencies.filters.search')}
                icon={Search} className="w-full [&_input]:text-sm" />
            </div>
          ) : null}
        </div>
      )}

      {level.failed ? <SaveFailed onRetry={level.retry} /> : null}

      <NajmScroll axis="y" autoHide="scroll" className="min-h-0 flex-1">
        <CompetencyTextScope domains={domains} className="mx-auto flex w-full max-w-3xl flex-col pb-6">{body}</CompetencyTextScope>
      </NajmScroll>

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
        <CompetencyTextScope domains={data?.domains ?? NO_DOMAINS} className="mx-auto flex w-full max-w-3xl flex-col pb-6">{body}</CompetencyTextScope>
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
