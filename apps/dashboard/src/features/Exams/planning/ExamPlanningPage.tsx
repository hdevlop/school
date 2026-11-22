'use client';

import { useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, FileText, List, Printer, Settings } from 'lucide-react';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { DateRangeInput, NajmScroll, NButton, NEmptyState, NErrorState, NForbiddenState, NLoadingState, NPageHeaderActions, NSheet, SelectInput, Tabs, TabsContent, useMediaQuery } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { toast } from 'sonner';
import { compareClassNames, examPlanningMonths, massarPlanningControls, toOfficialClassName, type ExamPlanningClass, type ExamPlanningEntry } from '@sms/contracts';
import { isDateOnly } from '@sms/contracts/academic-years';
import { schoolApp } from '@/najm.config';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useViewingAcademicYear, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useSchoolFormat, useSchoolToday } from '@/hooks/useSchoolFormat';
import { isAuthorizationError } from '@/services/apiError';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { MobileFeatureActions } from '@/shared/FeatureActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { classDocumentColors } from '@/features/Assessments/planning/planningModel';
import { buildPlanningDocument, printPlanningDocument, type PlanningDocumentOptions } from '@/features/Assessments/planning/planningDocument';
import { PlanningPreview } from '@/features/Assessments/planning/PlanningPreview';
import { useExamPlanning } from './useExamPlanning';
import { examPlanningControlNumbers, examPlanningEntries, examPlanningRecords, initialPlanningMonth, mayPlanEntry, plannableInClass, planningMonthRange, planningTextLanguage, updatePlanningMonthDraft, type ExamPlanningDrafts, type PlanningDateRange, type PlanningEntrySelection } from './examPlanningModel';
import { PlanningEntryEditor } from './PlanningEntryEditor';
import { PlanningClassSettings } from './PlanningClassSettings';
import { PlanningMissingSubjects, usePlanningSubjects } from './PlanningSubjects';
import { PlanningSchedule } from './PlanningSchedule';
import { PlanningJsonActions } from './PlanningJsonActions';
import { PlanningClearAction } from './PlanningClearAction';
import styles from './ExamPlanning.module.css';

/** One Contrôle of the year: its number restarts each semester. */
const controlKey = (control: { term: number; exam: number }) => `${control.term}-${control.exam}`;

function PlanningContent() {
  const { t, language } = useTranslation();
  const { viewingYear } = useViewingAcademicYear();
  const today = useSchoolToday();
  const { displayDate } = useSchoolFormat();
  // Phones and narrow tablets: the programme fills the page and an exam opens in a sheet.
  const narrow = useMediaQuery('(max-width: 850px)');
  const [sheetOpen, setSheetOpen] = useState(false);
  const viewer = useViewerRole();
  const { classes: catalog, isLoading, error, save, isSaving } = useExamPlanning();
  const { publicSettings, isSettingsLoading, error: settingsError } = usePublicSettings();
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;
  const logo = useNThemeBrandingSlot('authLogo');
  const [pickedView, setView] = useState<'planning' | 'preview'>('planning');
  const [pickedRange, setRange] = useState<PlanningDateRange | null>(null);
  const [pickedControl, setControl] = useState<string | null>(null);
  const [pickedClass, setClass] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlanningEntrySelection | null>(null);
  const [drafts, setDrafts] = useState<ExamPlanningDrafts>({});
  const [classSettings, setClassSettings] = useState<string[] | null>(null);
  const [isPrinting, setPrinting] = useState(false);
  const [savingDrafts, setSavingDrafts] = useState(false);
  const saving = isSaving || savingDrafts;
  const classes = [...catalog].sort((a, b) => compareClassNames(a.name, b.name));
  const visibleClasses = classes.filter(cls => cls.visible);
  const initialMonth = initialPlanningMonth(visibleClasses, today, viewingYear ?? '');
  // The page's tools (which classes show, import, clear, missing subjects) stay school-wide.
  const canManage = viewer.isSchoolWide && viewer.can('update:exams');
  // Planning a class's exams: the school-wide roles every subject, a teacher the subjects they teach there.
  const canEdit = viewer.can('update:exam-planning') && (viewer.isSchoolWide || viewer.role === 'teacher');
  // A teacher plans by Contrôle: the school sets each one's days, the teacher picks one (the latest
  // by default) and fills in their subjects within those days. Read from saved Planning, so edits never move it.
  const teacherPlanner = canEdit && !viewer.isSchoolWide;
  const controls = teacherPlanner ? massarPlanningControls(classes.map(cls => ({ classId: cls.id, months: cls.months }))) : [];
  const activeControl = controls.find(item => controlKey(item) === pickedControl) ?? controls.at(-1);
  const noControl = teacherPlanner && !activeControl;
  const range = activeControl ? { from: activeControl.examFrom, to: activeControl.examTo } : pickedRange ?? planningMonthRange(initialMonth);
  const yearMonths = examPlanningMonths(viewingYear ?? '');
  const yearFrom = `${yearMonths[0] ?? initialMonth}-01`;
  const yearTo = planningMonthRange(yearMonths.at(-1) ?? initialMonth).to;
  const invalidRange = !isDateOnly(range.from) || !isDateOnly(range.to) || range.from > range.to || range.from < yearFrom || range.to > yearTo;
  // The arrows step a whole month before the period's first month or after its last, within the year.
  const previousMonth = invalidRange ? undefined : yearMonths[yearMonths.indexOf(range.from.slice(0, 7)) - 1];
  const nextMonthIndex = invalidRange ? -1 : yearMonths.indexOf(range.to.slice(0, 7));
  const nextMonth = nextMonthIndex < 0 ? undefined : yearMonths[nextMonthIndex + 1];
  const entriesFor = (cls: ExamPlanningClass) => examPlanningEntries(cls, range, drafts);
  const monthEntriesFor = (cls: ExamPlanningClass, month: string) => drafts[cls.id]?.[month] ?? cls.months[month] ?? [];
  // A teacher works one class at a time; "all classes" is for the school-wide roles.
  const classId = pickedClass !== null && ((!pickedClass && !teacherPlanner) || visibleClasses.some(cls => cls.id === pickedClass))
    ? pickedClass : visibleClasses.find(cls => entriesFor(cls).length)?.id ?? visibleClasses[0]?.id ?? '';
  const shownClasses = visibleClasses.filter(cls => !classId || cls.id === classId);
  // Each Planning subject becomes an exam of its linked School subject on the Exams page.
  // Planning picks from Subjects; names Subjects lacks are added there (the Subjects permission decides).
  const planningSubjects = usePlanningSubjects(canEdit), [missingOpen, setMissingOpen] = useState(false), canAddSubjects = viewer.can('update:subjects');
  const allowedIn = (cls: ExamPlanningClass) => plannableInClass(planningSubjects.plannable, cls.id);
  const canChange = (cls: ExamPlanningClass, entry: ExamPlanningEntry) => mayPlanEntry(allowedIn(cls), planningSubjects.resolvable, entry.subject);
  const canAdd = (cls: ExamPlanningClass) => { const allowed = allowedIn(cls); return !allowed || allowed.size > 0; };
  // A teacher's Planning lists only their own subjects' exams; the A4 preview shows the whole class.
  const listedEntriesFor = (cls: ExamPlanningClass) => teacherPlanner ? entriesFor(cls).filter(entry => canChange(cls, entry)) : entriesFor(cls);
  // The planning tab is the editor; whoever cannot edit reads the printed calendar.
  const view = canEdit ? pickedView : 'preview';
  const defaultClass = shownClasses.find(cls => listedEntriesFor(cls).length);
  const pickedEntryClass = selected ? shownClasses.find(cls => cls.id === selected.classId && monthEntriesFor(cls, selected.month).some(entry => entry.id === selected.entryId)) : undefined;
  const selectedClass = pickedEntryClass ?? defaultClass;
  const selectedEntry = pickedEntryClass && selected ? monthEntriesFor(pickedEntryClass, selected.month).find(entry => entry.id === selected.entryId) : selectedClass ? listedEntriesFor(selectedClass)[0] : undefined;
  const selectedMonth = pickedEntryClass && selected ? selected.month : selectedEntry?.date.slice(0, 7);
  const effectiveSelection = selectedClass && selectedEntry && selectedMonth ? { classId: selectedClass.id, month: selectedMonth, entryId: selectedEntry.id } : null;
  // A teacher picks among the subjects they teach in the class, and reads the others' entries.
  const selectedLocked = !!selectedClass && !!selectedEntry && !canChange(selectedClass, selectedEntry);
  const selectedAllowed = selectedClass ? allowedIn(selectedClass) : null;
  // The class's own sub-subject lists (its level is its name), the school's otherwise.
  const classSubjects = selectedClass ? planningSubjects.forClass(selectedClass.name) : planningSubjects.data?.subjects;
  const editorSubjects = selectedLocked || !selectedAllowed ? classSubjects : classSubjects?.filter(subject => selectedAllowed.has(subject.id));
  const dirty = Object.keys(drafts).length > 0;
  const invalidDraft = Object.values(drafts).some(months => Object.entries(months).some(([month, entries]) => entries.some(entry => !entry.subject.trim() || !isDateOnly(entry.date) || !entry.date.startsWith(`${month}-`) || entry.lessons.filter(line => line.trim()).length > 40 || entry.lessons.some(line => line.trim().length > 500))));
  const records = invalidRange ? [] : examPlanningRecords(shownClasses, range, drafts);
  const outputDisabled = !records.length || dirty || !!error || isLoading || isSettingsLoading || !!settingsError || isPrinting || saving;
  const semesters = [...new Set(records.map(record => record.planning?.semester))];
  // The Contrôle these exams are, numbered the way Massar opens them.
  const control = examPlanningControlNumbers(classes, records.map(record => record.date), drafts)
    .map(exam => t('massar.flow.controlNumber', { exam })).join(' / ');
  const documentOptions: PlanningDocumentOptions = {
    title: t('examPlanning.documentTitle'), schoolName: settings?.schoolName || schoolApp.appName,
    schoolLogo: settings?.schoolLogo || logo, academicYear: viewingYear ?? '', semester: semesters.length === 1 ? semesters[0] ?? null : null, control: control || null, language,
    assetOrigin: typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
    labels: { semester: t('assessmentPlanning.semester'), academicYear: t('assessmentPlanning.academicYear'), class: t('assessments.form.class'), lessons: t('assessmentPlanning.lessons'), subject: t('assessments.form.subject'), date: t('assessments.form.date'), sections: t('assessmentPlanning.sections') },
  };
  const updateEntries = (cls: ExamPlanningClass, month: string, entries: ExamPlanningEntry[]) => {
    setRange(range); setClass(classId); if (activeControl) setControl(controlKey(activeControl));
    setDrafts(current => updatePlanningMonthDraft(current, cls, month, entries));
  };
  // Removed from the month's draft, like an edit; saving the month makes it final.
  const deleteEntry = (cls: ExamPlanningClass, entry: ExamPlanningEntry) => {
    const month = entry.date.slice(0, 7);
    updateEntries(cls, month, monthEntriesFor(cls, month).filter(item => item.id !== entry.id));
    if (effectiveSelection?.entryId === entry.id) setSelected(null);
  };
  const addEntry = (cls: ExamPlanningClass) => {
    // A teacher's new exam takes the Contrôle's first day; the school sets the real day and time.
    const date = teacherPlanner ? range.from : today >= range.from && today <= range.to ? today : range.from;
    const month = date.slice(0, 7);
    // No subject yet: the editor asks for one before the month can be saved.
    const entry: ExamPlanningEntry = { id: crypto.randomUUID(), date, subject: '', lessons: [] };
    updateEntries(cls, month, [...monthEntriesFor(cls, month), entry]); setSelected({ classId: cls.id, month, entryId: entry.id });
  };
  const updateEntry = (patch: Partial<ExamPlanningEntry>) => {
    if (selectedClass && selectedEntry && selectedMonth) updateEntries(selectedClass, selectedMonth, monthEntriesFor(selectedClass, selectedMonth).map(entry => entry.id === selectedEntry.id ? { ...entry, ...patch } : entry));
  };
  const saveDrafts = async () => {
    setSavingDrafts(true);
    try {
      for (const [id, months] of Object.entries(drafts)) {
        for (const [month, entries] of Object.entries(months)) {
          await save({ classId: id, month, entries: entries.map(entry => ({ ...entry, lessons: entry.lessons.map(line => line.trim()).filter(Boolean) })) });
          setDrafts(current => {
            const remaining = { ...current[id] }; delete remaining[month];
            const next = { ...current, [id]: remaining };
            if (!Object.keys(remaining).length) delete next[id];
            return next;
          });
        }
      }
      toast.success(t('examPlanning.saved'));
      return true;
    } catch (failure) {
      // A refused save says why (a subject this teacher does not teach there); anything else is generic.
      toast.error(isAuthorizationError(failure) && failure instanceof Error && failure.message ? failure.message : t('examPlanning.saveFailed'));
      return false;
    }
    finally { setSavingDrafts(false); }
  };
  const saveClasses = async () => {
    if (!classSettings) return;
    try { await save({ classIds: classSettings }); setClassSettings(null); toast.success(t('examPlanning.saved')); }
    catch { toast.error(t('examPlanning.saveFailed')); }
  };
  const print = async () => {
    setPrinting(true);
    try { if (!await printPlanningDocument(buildPlanningDocument(records, documentOptions))) toast.error(t('assessmentPlanning.popupBlocked')); }
    catch { toast.error(t('examPlanning.printFailed')); }
    finally { setPrinting(false); }
  };
  const discard = () => { setDrafts({}); setSelected(null); };
  const classPicker = !error && !isLoading && (
    <div className={styles.classRow} role="group" aria-label={t('assessments.form.class')}>
      {!teacherPlanner && <button className={styles.classButton} type="button" aria-pressed={!classId} disabled={dirty || saving} onClick={() => { setClass(''); setSelected(null); }}>{t('assessmentPlanning.allClasses')}</button>}
      {visibleClasses.map(cls => <button className={styles.classButton} key={cls.id} type="button" title={cls.name} aria-pressed={classId === cls.id} disabled={dirty || saving} onClick={() => { setClass(cls.id); setSelected(null); }}><span className={styles.dot} style={{ background: classDocumentColors(cls.name)[0] }} aria-hidden="true" />{toOfficialClassName(cls.name)}</button>)}
    </div>
  );

  return <div className={styles.page} data-exam-planning>
    <NPageHeader icon={FEATURE_ICONS.assessmentPlanning} title={t('examPlanning.title')} subtitle={canManage ? t('examPlanning.subtitle') : canEdit ? t('examPlanning.teacherSubtitle') : undefined}>
      <NPageHeaderActions>
        <PageHeaderGlobalActions />
      </NPageHeaderActions>
    </NPageHeader>
    <NajmScroll axis="y" autoHide="scroll" className={styles.scrollArea}>
      <main className={styles.main}>
        <Tabs value={view} onValueChange={value => { if (canEdit) setView(value as 'planning' | 'preview'); }} className="gap-0">
        <div className={styles.toolbar}>
          {/* One line: the view switch, classes, then the period and tools. */}
          {canEdit && <div className={styles.viewSwitch} role="group" aria-label={t('examPlanning.viewLabel')}>
            <button type="button" aria-pressed={view === 'planning'} onClick={() => setView('planning')}><List aria-hidden="true" />{t('assessmentPlanning.planningTab')}</button>
            <button type="button" aria-pressed={view === 'preview'} onClick={() => setView('preview')}><FileText aria-hidden="true" />{t('assessmentPlanning.previewTab')}</button>
          </div>}          {classPicker}
          <div className={styles.toolbarControls} data-preview-only={!canEdit}>
          <fieldset className={styles.dateFilters} disabled={dirty || saving || isLoading}>
            {teacherPlanner ? <div className={styles.dateField}>
              <SelectInput ariaLabel={t('examPlanning.control')} placeholder={t('examPlanning.noControlTitle')} className="w-56 max-sm:w-full" showIcon={false} disabled={dirty || saving || isLoading || !controls.length}
                items={controls.map(item => ({ value: controlKey(item), label: `${t('massar.flow.controlNumber', { exam: item.exam })} · ${t('massar.flow.semester', { term: item.term })}` }))}
                value={activeControl ? controlKey(activeControl) : ''} onChange={value => { setControl(String(value)); setSelected(null); }} />
            </div> : <div className={styles.dateField}>
              <NButton type="button" variant="outline" size="icon" aria-label={t('examPlanning.previousMonth')} title={t('examPlanning.previousMonth')} disabled={!previousMonth} onClick={() => { if (previousMonth) { setRange(planningMonthRange(previousMonth)); setClass(classId); setSelected(null); } }}><ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" /></NButton>
              <DateRangeInput ariaLabel={t('assessmentPlanning.period')} className="w-64 max-sm:w-auto max-sm:min-w-0 max-sm:flex-1" value={range} min={yearFrom} max={yearTo} onChange={({ from, to }) => { if (from && to) { setRange({ from, to }); setClass(classId); setSelected(null); } }} />
              <NButton type="button" variant="outline" size="icon" aria-label={t('examPlanning.nextMonth')} title={t('examPlanning.nextMonth')} disabled={!nextMonth} onClick={() => { if (nextMonth) { setRange(planningMonthRange(nextMonth)); setClass(classId); setSelected(null); } }}><ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" /></NButton>
            </div>}
          </fieldset>
          <MobileFeatureActions><div className={styles.toolbarActions}>
            {canManage && <PlanningClearAction schoolYear={viewingYear ?? ''} disabled={isLoading || !!error || (!dirty && !classes.some(cls => Object.values(cls.months).some(entries => entries.length)))} saving={saving} onClear={async () => { await save({ clear: true }); discard(); setView('planning'); }} />}
            {canManage && <PlanningJsonActions classes={classes} schoolYear={viewingYear ?? ''} disabled={dirty || saving || isLoading || !!error} saving={saving} onImport={async document => { await save({ document }); setSelected(null); }} />}
            {canManage && <NButton variant="outline" size="icon" aria-label={t('examPlanning.classSettings')} title={t('examPlanning.classSettings')} disabled={isLoading || !!error || dirty || saving} onClick={() => setClassSettings(visibleClasses.map(cls => cls.id))}><Settings className="size-4" aria-hidden="true" /></NButton>}
            <NButton variant="outline" size="icon" aria-label={t('assessmentPlanning.print')} title={t('assessmentPlanning.print')} disabled={outputDisabled} onClick={print} leftIcon={<Printer className="size-4" />} />
          </div></MobileFeatureActions>
          </div>
        </div>
        {error ? isAuthorizationError(error) ? <NForbiddenState surface="panel" /> : <NErrorState surface="panel" />
          : isLoading ? <NLoadingState surface="panel" label={t('common.loading')} />
            : <>
              {canManage && planningSubjects.missing.length > 0 && <p className={styles.alert} role="status">{t('examPlanning.subjects.missing', { count: planningSubjects.missing.length })} {canAddSubjects && <button type="button" className="font-medium text-primary underline underline-offset-2" disabled={dirty || saving} onClick={() => setMissingOpen(true)}>{t('examPlanning.subjects.addThem')}</button>}</p>}
              {noControl ? <NEmptyState icon={FEATURE_ICONS.assessmentPlanning} surface="panel" title={t('examPlanning.noControlTitle')} description={t('examPlanning.noControlDescription')} />
                : invalidRange ? <p className={styles.alert} role="alert">{t('assessmentPlanning.invalidRange')}</p>
                : !shownClasses.length ? <NEmptyState icon={FEATURE_ICONS.assessmentPlanning} surface="panel" title={t('examPlanning.noClasses')} description={canManage ? t('examPlanning.chooseClasses') : undefined} />
                : <TabsContent value={view} className="mt-0 min-w-0">
                  {view === 'preview' ? invalidDraft ? <p role="alert" className={styles.alert}>{t('examPlanning.invalidDraft')}</p>
                    : !records.length ? <NEmptyState icon={FEATURE_ICONS.assessmentPlanning} surface="panel" title={t('examPlanning.emptyTitle')} description={canEdit ? t('examPlanning.emptyDescription') : undefined} />
                    : settingsError ? <NErrorState surface="panel" /> : isSettingsLoading ? <NLoadingState surface="panel" label={t('common.loading')} />
                    : <>
                      <div className={styles.paperStage}><PlanningPreview html={buildPlanningDocument(records, documentOptions)} title={t('assessmentPlanning.previewTab')} /></div>
                      <p className={styles.previewTip}>{t('examPlanning.previewTip')}</p>
                    </>
                    : <div className={styles.editorLayout}>
                      <PlanningSchedule classes={shownClasses} entriesFor={listedEntriesFor} emptyText={cls => teacherPlanner && entriesFor(cls).length ? t('examPlanning.noOwnExams') : undefined} selected={narrow && !sheetOpen ? null : effectiveSelection} saving={saving} canAdd={canAdd} canChange={canChange}
                        onSelect={value => { setSelected(value); if (narrow) setSheetOpen(true); }} onAdd={cls => { addEntry(cls); if (narrow) setSheetOpen(true); }} onDelete={deleteEntry} />
                      {narrow ? null : selectedEntry && selectedClass && selectedMonth ? <PlanningEntryEditor key={selectedClass.id + ':' + selectedMonth + ':' + selectedEntry.id} entry={selectedEntry} subjects={editorSubjects} dateRange={activeControl ? range : undefined} scheduleLocked={teacherPlanner} locked={selectedLocked} className={toOfficialClassName(selectedClass.name)} month={selectedMonth} disabled={saving} dirty={dirty} valid={!invalidDraft} onChange={updateEntry} onCancel={discard} onSave={() => { void saveDrafts(); }} />
                        : <aside className={styles.editPanel} aria-label={t('examPlanning.editLessons')}>
                          <p className={styles.secondary}>{t(dirty ? 'examPlanning.unsaved' : 'examPlanning.selectSubject')}</p>
                          {dirty && <div className={styles.editorActions}>
                            <NButton variant="outline" type="button" disabled={saving} onClick={discard}>{t('common.cancel')}</NButton>
                            <NButton className={styles.applyButton} type="button" disabled={saving || invalidDraft} loading={saving} onClick={() => { void saveDrafts(); }}>{t('common.save')}</NButton>
                          </div>}
                        </aside>}
                    </div>}
                  {/* Changes kept after the sheet closed: saved or dropped from the page. */}
                  {view === 'planning' && narrow && dirty && !sheetOpen && <div className={styles.unsavedBar} role="status">
                    <p>{t('examPlanning.unsaved')}</p>
                    <NButton variant="outline" size="sm" type="button" disabled={saving} onClick={discard}>{t('common.cancel')}</NButton>
                    <NButton size="sm" type="button" disabled={saving || invalidDraft} loading={saving} leftIcon={<Check className="size-4" />} onClick={() => { void saveDrafts(); }}>{t('common.save')}</NButton>
                  </div>}
                </TabsContent>}
            </>}
        </Tabs>
      </main>
    </NajmScroll>
    {/* Phones: the exam opens over the programme, its buttons always in reach at the bottom. */}
    {narrow && canEdit && <NSheet open={sheetOpen && view === 'planning' && !!selectedEntry} onOpenChange={open => { if (!open && !saving) setSheetOpen(false); }} icon={CalendarDays}
      title={selectedEntry ? <span className={styles.sheetTitle} lang={planningTextLanguage(selectedEntry.subject)} dir="auto">{selectedEntry.subject || t('examPlanning.newEntry')}</span> : t('examPlanning.newEntry')}
      description={selectedEntry && selectedClass ? [displayDate(selectedEntry.date, { weekday: 'long', day: 'numeric', month: 'long' }), selectedEntry.startTime && selectedEntry.endTime ? `${selectedEntry.startTime} – ${selectedEntry.endTime}` : null, toOfficialClassName(selectedClass.name)].filter(Boolean).join(' · ') : undefined}
      footer={dirty ? <div className="flex gap-2">
        <NButton type="button" variant="outline" className="flex-1" disabled={saving} onClick={() => { discard(); setSheetOpen(false); }}>{t('common.cancel')}</NButton>
        <NButton type="button" className="flex-1" disabled={saving || invalidDraft} loading={saving} leftIcon={<Check className="size-4" />} onClick={() => { void saveDrafts().then(saved => { if (saved) setSheetOpen(false); }); }}>{t('common.save')}</NButton>
      </div> : <NButton type="button" variant="outline" className="w-full" onClick={() => setSheetOpen(false)}>{t('common.close')}</NButton>}>
      {selectedEntry && selectedClass && selectedMonth && <PlanningEntryEditor bare key={selectedClass.id + ':' + selectedMonth + ':' + selectedEntry.id} entry={selectedEntry} subjects={editorSubjects} dateRange={activeControl ? range : undefined} scheduleLocked={teacherPlanner} locked={selectedLocked} className={toOfficialClassName(selectedClass.name)} month={selectedMonth} disabled={saving} dirty={dirty} valid={!invalidDraft} onChange={updateEntry} onCancel={discard} onSave={() => { void saveDrafts(); }} />}
    </NSheet>}
    {canManage && canAddSubjects && <PlanningMissingSubjects open={missingOpen} onOpenChange={setMissingOpen} state={planningSubjects} />}
    {canManage && <PlanningClassSettings classes={classes} selection={classSettings} saving={saving} onChange={setClassSettings} onClose={() => setClassSettings(null)} onSave={saveClasses} />}
  </div>;
}

export default function ExamPlanningPage() {
  const yearKey = useViewingYearKey();
  return <PlanningContent key={yearKey} />;
}
