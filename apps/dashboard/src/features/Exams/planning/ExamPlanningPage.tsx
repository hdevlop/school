'use client';

import { useState } from 'react';
import { BookOpenCheck, CalendarDays, Check, Download, FileText, List, Plus, Printer, Settings, Upload, Users } from 'lucide-react';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, NajmScroll, NButton, NEmptyState, NErrorState, NForbiddenState, NLoadingState, NPageHeaderActions, NSheet, SelectInput, Tabs, TabsContent, useMediaQuery } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { toast } from 'sonner';
import { compareClassNames, controlNumbers, foldSubjectName, toOfficialClassName, type ExamControl, type ExamPlanningClass, type ExamPlanningEntry } from '@sms/contracts';
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
import { useExamControls } from './useExamControls';
import { ExamControlDialog } from './ExamControlDialog';
import { ControlPicker } from './ControlPicker';
import { useDialog } from '@/shared/useDialog';
import { periodControls, examPlanningControlNumbers, teacherControls, examPlanningEntries, examPlanningRecords, mayPlanEntry, plannableInClass, planningTextLanguage, updatePlanningMonthDraft, type ExamPlanningDrafts, type PlanningEntrySelection } from './examPlanningModel';
import { PlanningEntryEditor } from './PlanningEntryEditor';
import { PlanningClassSettings } from './PlanningClassSettings';
import { PlanningMissingSubjects, usePlanningSubjects } from './PlanningSubjects';
import { PlanningSchedule } from './PlanningSchedule';
import { usePlanningJson } from './PlanningJsonActions';
import { PlanningClearAction } from './PlanningClearAction';
import styles from './ExamPlanning.module.css';

/** The calendar (a teacher's lessons) where exams are added subject by subject, then the A4. */
type View = 'planning' | 'preview';

function PlanningContent() {
  const { t, language } = useTranslation();
  const { viewingYear } = useViewingAcademicYear();
  const today = useSchoolToday();
  const { displayDate } = useSchoolFormat();
  // Phones and narrow tablets: the programme fills the page and an exam opens in a sheet.
  const narrow = useMediaQuery('(max-width: 850px)');
  // Phones pick the class from a dropdown; wider screens keep a button per class.
  const phone = useMediaQuery('(max-width: 620px)');
  const [sheetOpen, setSheetOpen] = useState(false);
  const viewer = useViewerRole();
  const { confirmDelete } = useDialog();
  const { classes: catalog, isLoading, error, save, isSaving } = useExamPlanning();
  const { publicSettings, isSettingsLoading, error: settingsError } = usePublicSettings();
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;
  const logo = useNThemeBrandingSlot('authLogo');
  const [pickedView, setView] = useState<View | null>(null);
  const [pickedControl, setControl] = useState<string | null>(null);
  const [controlDialog, setControlDialog] = useState<{ control: ExamControl | null } | null>(null);
  const [pickedClass, setClass] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlanningEntrySelection | null>(null);
  const [drafts, setDrafts] = useState<ExamPlanningDrafts>({});
  const [classSettings, setClassSettings] = useState<string[] | null>(null);
  const [isPrinting, setPrinting] = useState(false);
  const [savingDrafts, setSavingDrafts] = useState(false);
  const saving = isSaving || savingDrafts;
  const classes = [...catalog].sort((a, b) => compareClassNames(a.name, b.name));
  const visibleClasses = classes.filter(cls => cls.visible);
  // The page's tools (which classes show, import, clear, missing subjects) stay school-wide.
  const canManage = viewer.isSchoolWide && viewer.can('update:exams');
  // Planning a class's exams: the school-wide roles every subject, a supervisor every subject of the classes
  // they supervise, a teacher the subjects they teach there.
  const isSupervisor = viewer.role === 'supervisor';
  const canEdit = viewer.can('update:exam-planning') && (viewer.isSchoolWide || viewer.role === 'teacher' || isSupervisor);
  // Opening Contrôles: the school-wide roles for any class, a supervisor for their own.
  const canManageControls = (viewer.isSchoolWide || isSupervisor)
    && ['create', 'update', 'delete'].some(action => viewer.can(`${action}:exam-controls`));
  // Each Planning subject becomes an exam of its linked School subject on the Exams page.
  // Planning picks from Subjects; names Subjects lacks are added there (the Subjects permission decides).
  const planningSubjects = usePlanningSubjects(canEdit), [missingOpen, setMissingOpen] = useState(false), canAddSubjects = viewer.can('update:subjects');
  const examControls = useExamControls();
  // A teacher plans by Contrôle: the school sets each one's days, the teacher picks one (the latest
  // by default) and fills in their subjects within those days.
  const teacherPlanner = canEdit && viewer.role === 'teacher';
  // A teacher works one class at a time; "all classes" is for the school-wide roles, and on a phone
  // only for the A4 (printing every class at once): its calendar is one class's. Until one is picked, the first.
  const allClassesOffered = !teacherPlanner && (!phone || (canEdit ? pickedView ?? 'planning' : 'preview') === 'preview');
  const classId = pickedClass !== null && ((!pickedClass && allClassesOffered) || visibleClasses.some(cls => cls.id === pickedClass))
    ? pickedClass : visibleClasses[0]?.id ?? '';
  // The period is always a Contrôle the class on screen sits (any class's for "all classes"); the school opens them with +.
  const controls = teacherPlanner
    ? teacherControls(examControls.controls, classes.map(cls => cls.id), planningSubjects.plannable).filter(item => item.derived || !classId || item.classIds.includes(classId))
    : periodControls(examControls.controls ?? [], classId || null);
  // Until one is picked, the class's latest Contrôle: the one being prepared.
  const activeControl = controls.find(item => item.id === pickedControl) ?? controls.at(-1);
  // "Contrôle 2 · 02/11/2026 – 06/11/2026", numbered for the teacher's classes or the picked class.
  const controlOption = (item: ExamControl) => {
    const numbers = controlNumbers(examControls.controls ?? [], item, classId ? [classId] : teacherPlanner ? classes.map(cls => cls.id) : undefined);
    const day = (value: string) => narrow ? displayDate(value, { day: '2-digit', month: '2-digit' }) : displayDate(value);
    const days = item.dateFrom === item.dateTo ? day(item.dateFrom) : `${day(item.dateFrom)} – ${day(item.dateTo)}`;
    return `${t('massar.flow.controlNumber', { exam: numbers.join(' / ') })} · ${days}`;
  };
  const noControl = !examControls.isLoading && !activeControl;
  // No Contrôle: nothing is shown (an empty span), and the page asks for one.
  const range = activeControl ? { from: activeControl.dateFrom, to: activeControl.dateTo } : { from: '', to: '' };
  const entriesFor = (cls: ExamPlanningClass) => examPlanningEntries(cls, range, drafts);
  const monthEntriesFor = (cls: ExamPlanningClass, month: string) => drafts[cls.id]?.[month] ?? cls.months[month] ?? [];
  const shownClasses = visibleClasses.filter(cls => !classId || cls.id === classId);
  const allowedIn = (cls: ExamPlanningClass) => plannableInClass(planningSubjects.plannable, cls.id);
  const canChange = (cls: ExamPlanningClass, entry: ExamPlanningEntry) => mayPlanEntry(allowedIn(cls), planningSubjects.resolvable, entry.subject);
  // The school plans the exams; a teacher writes their lessons, adding and removing none.
  const canAdd = (cls: ExamPlanningClass) => { const allowed = allowedIn(cls); return !teacherPlanner && (!allowed || allowed.size > 0); };
  const canRemove = (cls: ExamPlanningClass, entry: ExamPlanningEntry) => !teacherPlanner && canChange(cls, entry);
  // A teacher's Planning lists only their own subjects' exams; the A4 preview shows the whole class.
  const listedEntriesFor = (cls: ExamPlanningClass) => teacherPlanner ? entriesFor(cls).filter(entry => canChange(cls, entry)) : entriesFor(cls);
  // The calendar is the editor (a teacher's lessons); whoever cannot edit reads the printed calendar.
  const view: View = canEdit ? pickedView ?? 'planning' : 'preview';
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
  // What the class already has an exam of in this Contrôle is not offered again: one exam a subject (or sub-subject).
  const takenNames = selectedClass && selectedEntry
    ? new Set(entriesFor(selectedClass).filter(entry => entry.id !== selectedEntry.id).map(entry => foldSubjectName(entry.subject)))
    : undefined;
  const dirty = Object.keys(drafts).length > 0;
  // Export and import sit in the settings menu; the import dialog renders once below.
  const planningJson = usePlanningJson({ classes, schoolYear: viewingYear ?? '', disabled: dirty || saving || isLoading || !!error, saving,
    onImport: async document => { await save({ document }); setSelected(null); } });
  const invalidDraft = Object.values(drafts).some(months => Object.entries(months).some(([month, entries]) => entries.some(entry => !entry.subject.trim() || !isDateOnly(entry.date) || !entry.date.startsWith(`${month}-`) || entry.lessons.filter(line => line.trim()).length > 40 || entry.lessons.some(line => line.trim().length > 500))));
  const records = activeControl ? examPlanningRecords(shownClasses, range, drafts) : [];
  const outputDisabled = !records.length || dirty || !!error || isLoading || isSettingsLoading || !!settingsError || isPrinting || saving;
  const semesters = [...new Set(records.map(record => record.planning?.semester))];
  // The Contrôle these exams are, numbered the way Massar opens them.
  const control = examPlanningControlNumbers(examControls.controls, records)
    .map(exam => t('massar.flow.controlNumber', { exam })).join(' / ');
  const documentOptions: PlanningDocumentOptions = {
    title: t('examPlanning.documentTitle'), schoolName: settings?.schoolName || schoolApp.appName,
    schoolLogo: settings?.schoolLogo || logo, academicYear: viewingYear ?? '', semester: semesters.length === 1 ? semesters[0] ?? null : null, control: control || null, language,
    assetOrigin: typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
    labels: { semester: t('assessmentPlanning.semester'), academicYear: t('assessmentPlanning.academicYear'), class: t('assessments.form.class'), lessons: t('assessmentPlanning.lessons'), subject: t('assessments.form.subject'), date: t('assessments.form.date'), sections: t('assessmentPlanning.sections') },
  };
  const updateEntries = (cls: ExamPlanningClass, month: string, entries: ExamPlanningEntry[]) => {
    setClass(classId); if (activeControl) setControl(activeControl.id);
    setDrafts(current => updatePlanningMonthDraft(current, cls, month, entries));
  };
  /**
   * The trash removes the exam at once, after a confirmation: it is not one
   * more unsaved change, which the open exam's Cancel would bring back. An
   * exam never saved only leaves the draft. The month's other unsaved changes
   * stay unsaved.
   */
  const deleteEntry = (cls: ExamPlanningClass, entry: ExamPlanningEntry) => {
    const month = entry.date.slice(0, 7);
    const saved = cls.months[month] ?? [];
    const left = saved.filter(item => item.id !== entry.id);
    const forget = () => {
      setDrafts(current => {
        const draft = current[cls.id]?.[month];
        // Compared with the month as now saved, so a draft the deletion made equal is no longer unsaved.
        return draft ? updatePlanningMonthDraft(current, { ...cls, months: { ...cls.months, [month]: left } }, month, draft.filter(item => item.id !== entry.id)) : current;
      });
      if (effectiveSelection?.entryId === entry.id) setSelected(null);
    };
    if (!saved.some(item => item.id === entry.id)) { forget(); return; }
    confirmDelete({
      title: t('common.delete'), warningText: t('examPlanning.deleteExamWarning'), cancelText: t('common.cancel'),
      itemName: [entry.subject.trim(), toOfficialClassName(cls.name)].filter(Boolean).join(' · '), confirmText: t('common.delete'),
      onConfirm: async () => {
        setSavingDrafts(true);
        try {
          await save({ classId: cls.id, month, entries: left });
          forget();
          toast.success(t('examPlanning.examDeleted'));
        } catch (failure) {
          toast.error(isAuthorizationError(failure) && failure instanceof Error && failure.message ? failure.message : t('examPlanning.saveFailed'));
        } finally { setSavingDrafts(false); }
      },
    });
  };
  const addEntry = (cls: ExamPlanningClass, subject = '') => {
    const date = today >= range.from && today <= range.to ? today : range.from;
    const month = date.slice(0, 7);
    // No subject yet: the editor asks for one before the month can be saved.
    const entry: ExamPlanningEntry = { id: crypto.randomUUID(), date, subject, lessons: [] };
    updateEntries(cls, month, [...monthEntriesFor(cls, month), entry]); setSelected({ classId: cls.id, month, entryId: entry.id });
  };
  const updateEntry = (patch: Partial<ExamPlanningEntry>) => {
    if (!selectedClass || !selectedEntry || !selectedMonth) return;
    const next = { ...selectedEntry, ...patch };
    const month = next.date.slice(0, 7);
    if (month === selectedMonth) {
      updateEntries(selectedClass, selectedMonth, monthEntriesFor(selectedClass, selectedMonth).map(entry => entry.id === selectedEntry.id ? next : entry));
      return;
    }
    // A Contrôle across two months: the exam leaves its month for the other, and stays the one open.
    const cls = selectedClass, from = selectedMonth;
    const left = monthEntriesFor(cls, from).filter(entry => entry.id !== selectedEntry.id), joined = [...monthEntriesFor(cls, month), next];
    setClass(classId); if (activeControl) setControl(activeControl.id);
    setDrafts(current => updatePlanningMonthDraft(updatePlanningMonthDraft(current, cls, from, left), cls, month, joined));
    setSelected({ classId: cls.id, month, entryId: next.id });
  };
  const saveDrafts = async () => {
    setSavingDrafts(true);
    try {
      // A month that gains an exam saves before one that loses it: an exam moved across a Contrôle's two
      // months is never saved out of both, even if the second save fails.
      const gains = (id: string, month: string, entries: ExamPlanningEntry[]) => {
        const saved = classes.find(cls => cls.id === id)?.months[month] ?? [];
        return entries.some(entry => !saved.some(other => other.id === entry.id));
      };
      const pending = Object.entries(drafts).flatMap(([id, months]) => Object.entries(months).map(([month, entries]) => ({ id, month, entries })))
        .sort((a, b) => Number(gains(b.id, b.month, b.entries)) - Number(gains(a.id, a.month, a.entries)));
      for (const { id, month, entries } of pending) {
        await save({ classId: id, month, entries: entries.map(entry => ({ ...entry, lessons: entry.lessons.map(line => line.trim()).filter(Boolean) })) });
        setDrafts(current => {
          const remaining = { ...current[id] }; delete remaining[month];
          const next = { ...current, [id]: remaining };
          if (!Object.keys(remaining).length) delete next[id];
          return next;
        });
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
  // The school opens a Contrôle (its week and classes); on a phone beside the class, beside the Contrôle otherwise.
  const addControlButton = canManageControls && viewer.can('create:exam-controls') && <NButton type="button" size="icon"
    aria-label={t('examPlanning.controls.add')} title={t('examPlanning.controls.add')} disabled={examControls.isLoading || dirty || saving}
    onClick={() => setControlDialog({ control: null })}><Plus className="size-4" aria-hidden="true" /></NButton>;
  const removeControl = (control: ExamControl) => confirmDelete({
    title: t('common.delete'), warningText: t('examPlanning.controls.deleteWarning'), cancelText: t('common.cancel'),
    itemName: controlOption(control), confirmText: t('common.delete'),
    onConfirm: async () => {
      try { await examControls.change({ id: control.id, remove: true }); toast.success(t('examPlanning.controls.deleted')); setControl(null); setSelected(null); }
      catch (failure) { toast.error(failure instanceof Error && failure.message ? failure.message : t('examPlanning.controls.saveFailed')); }
    },
  });
  const ALL_CLASSES = '__all__';
  const classPicker = !error && !isLoading && (phone ? (
    <div className={styles.classSelect}><SelectInput ariaLabel={t('assessments.form.class')} className="w-full" showIcon={false} disabled={dirty || saving}
      items={[...(allClassesOffered ? [{ value: ALL_CLASSES, label: t('assessmentPlanning.allClasses') }] : []), ...visibleClasses.map(cls => ({ value: cls.id, label: toOfficialClassName(cls.name) }))]}
      value={classId || ALL_CLASSES} onChange={value => { setClass(String(value) === ALL_CLASSES ? '' : String(value)); setSelected(null); }} /></div>
  ) : (
    <div className={styles.classRow} role="group" aria-label={t('assessments.form.class')}>
      {!teacherPlanner && <button className={styles.classButton} type="button" aria-pressed={!classId} disabled={dirty || saving} onClick={() => { setClass(''); setSelected(null); }}>{t('assessmentPlanning.allClasses')}</button>}
      {visibleClasses.map(cls => <button className={styles.classButton} key={cls.id} type="button" title={cls.name} aria-pressed={classId === cls.id} disabled={dirty || saving} onClick={() => { setClass(cls.id); setSelected(null); }}><span className={styles.dot} style={{ background: classDocumentColors(cls.name)[0] }} aria-hidden="true" />{toOfficialClassName(cls.name)}</button>)}
    </div>
  ));

  return <div className={styles.page} data-exam-planning>
    <NPageHeader icon={FEATURE_ICONS.assessmentPlanning} title={t('examPlanning.title')} subtitle={canManage ? t('examPlanning.subtitle') : canEdit ? t('examPlanning.teacherSubtitle') : undefined}>
      <NPageHeaderActions>
        <PageHeaderGlobalActions />
      </NPageHeaderActions>
    </NPageHeader>
    <NajmScroll axis="y" autoHide="scroll" className={styles.scrollArea}>
      <main className={styles.main}>
        <Tabs value={view} onValueChange={value => setView(value as View)} className="gap-0">
        <div className={styles.toolbar}>
          {/* One line: the view switch, classes, then the period and tools. */}
          {canEdit && <div className={styles.viewSwitch} role="group" aria-label={t('examPlanning.viewLabel')} data-roomy={!addControlButton || undefined}>
            <button type="button" aria-pressed={view === 'planning'} onClick={() => setView('planning')}>
              {teacherPlanner ? <><BookOpenCheck aria-hidden="true" /><span className={styles.toolLabel}>{t('examPlanning.myLessons')}</span></> : <><List aria-hidden="true" /><span className={styles.toolLabel}>{t('examPlanning.calendar')}</span></>}
            </button>
            <button type="button" aria-pressed={view === 'preview'} onClick={() => setView('preview')}><FileText aria-hidden="true" /><span className={styles.toolLabel}>{t('assessmentPlanning.previewTab')}</span></button>
          </div>}
          {classPicker}
          {phone && addControlButton}
          <div className={styles.toolbarControls} data-preview-only={!canEdit}>
          <fieldset className={styles.dateFilters} disabled={dirty || saving || isLoading}>
            {(teacherPlanner || controls.length > 0 || canManageControls) && <div className={styles.dateField}>
              {/* The Contrôle shown; the school changes or removes each one from the same menu. */}
              <ControlPicker controls={controls} active={activeControl} label={controlOption} disabled={dirty || saving || isLoading}
                className="w-80 max-sm:w-auto max-sm:min-w-0 max-sm:flex-1"
                canEdit={canManageControls && viewer.can('update:exam-controls')} canDelete={canManageControls && viewer.can('delete:exam-controls')}
                onPick={item => { setControl(item.id); setSelected(null); }} onEdit={item => setControlDialog({ control: item })} onDelete={removeControl} />
              {!phone && addControlButton}
            </div>}
          </fieldset>
          <MobileFeatureActions><div className={styles.toolbarActions}>
            {canManage && <PlanningClearAction schoolYear={viewingYear ?? ''} disabled={isLoading || !!error || (!dirty && !classes.some(cls => Object.values(cls.months).some(entries => entries.length)))} saving={saving} onClear={async () => { await save({ clear: true }); discard(); setView('planning'); }} />}
            {canManage && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <NButton variant="outline" size="icon" aria-label={t('examPlanning.classSettings')} title={t('examPlanning.classSettings')}><Settings className="size-4" aria-hidden="true" /></NButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={isLoading || !!error || dirty || saving} onSelect={() => setClassSettings(visibleClasses.map(cls => cls.id))}>
                  <Users className="size-4" aria-hidden="true" />{t('examPlanning.classSettings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={planningJson.unavailable} onSelect={planningJson.exportJson}><Download className="size-4" aria-hidden="true" />{t('examPlanning.json.export')}</DropdownMenuItem>
                <DropdownMenuItem disabled={planningJson.unavailable} onSelect={planningJson.openImport}><Upload className="size-4" aria-hidden="true" />{t('examPlanning.json.import')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
            <NButton variant="outline" size="icon" aria-label={t('assessmentPlanning.print')} title={t('assessmentPlanning.print')} disabled={outputDisabled} onClick={print} leftIcon={<Printer className="size-4" />} />
          </div></MobileFeatureActions>
          </div>
        </div>
        {error ? isAuthorizationError(error) ? <NForbiddenState surface="panel" /> : <NErrorState surface="panel" />
          : isLoading || (teacherPlanner && examControls.isLoading) ? <NLoadingState surface="panel" label={t('common.loading')} />
            : <>
              {canManage && planningSubjects.missing.length > 0 && <p className={styles.alert} role="status">{t('examPlanning.subjects.missing', { count: planningSubjects.missing.length })} {canAddSubjects && <button type="button" className="font-medium text-primary underline underline-offset-2" disabled={dirty || saving} onClick={() => setMissingOpen(true)}>{t('examPlanning.subjects.addThem')}</button>}</p>}
              {noControl ? <NEmptyState icon={FEATURE_ICONS.assessmentPlanning} surface="panel" title={t('examPlanning.noControlTitle')}
                description={canManageControls ? undefined : t('examPlanning.noControlDescription')}
                action={canManageControls && viewer.can('create:exam-controls') ? <NButton type="button" leftIcon={<Plus className="size-4" />} onClick={() => setControlDialog({ control: null })}>{t('examPlanning.controls.add')}</NButton> : undefined} />
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
                      {/* The school and teachers alike: the Contrôle's days, each with its exams; a teacher's own subjects only. */}
                      <PlanningSchedule classes={shownClasses} entriesFor={listedEntriesFor} emptyText={() => teacherPlanner ? t('examPlanning.noOwnExams') : undefined}
                        toPlaceTitle={teacherPlanner ? t('examPlanning.dayBySchool') : undefined} plain={narrow || teacherPlanner} selected={narrow && !sheetOpen ? null : effectiveSelection} saving={saving} canAdd={canAdd} canChange={canRemove}
                        onSelect={value => { setSelected(value); if (narrow) setSheetOpen(true); }} onAdd={cls => { addEntry(cls); if (narrow) setSheetOpen(true); }} onDelete={deleteEntry} />
                      {narrow ? null : selectedEntry && selectedClass && selectedMonth ? <PlanningEntryEditor key={selectedClass.id + ':' + selectedMonth + ':' + selectedEntry.id} entry={selectedEntry} subjects={editorSubjects} taken={takenNames} dateRange={activeControl ? range : undefined} scheduleLocked={teacherPlanner} locked={selectedLocked} className={toOfficialClassName(selectedClass.name)} month={selectedMonth} disabled={saving} dirty={dirty} valid={!invalidDraft} onChange={updateEntry} onCancel={discard} onSave={() => { void saveDrafts(); }} />
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
      {selectedEntry && selectedClass && selectedMonth && <PlanningEntryEditor bare key={selectedClass.id + ':' + selectedMonth + ':' + selectedEntry.id} entry={selectedEntry} subjects={editorSubjects} taken={takenNames} dateRange={activeControl ? range : undefined} scheduleLocked={teacherPlanner} locked={selectedLocked} className={toOfficialClassName(selectedClass.name)} month={selectedMonth} disabled={saving} dirty={dirty} valid={!invalidDraft} onChange={updateEntry} onCancel={discard} onSave={() => { void saveDrafts(); }} />}
    </NSheet>}
    {canManage && canAddSubjects && <PlanningMissingSubjects open={missingOpen} onOpenChange={setMissingOpen} state={planningSubjects} />}
    {canManageControls && <ExamControlDialog open={!!controlDialog} control={controlDialog?.control ?? null} classes={classes} saving={examControls.isChanging}
      canDelete={viewer.can('delete:exam-controls')} onChange={examControls.change} onClose={() => setControlDialog(null)}
      onSaved={(input, saved) => {
        // The Contrôle just saved is the one picked; a removed one gives way to the default.
        const found = input && Array.isArray(saved) ? (saved as ExamControl[]).find(item => item.dateFrom === input.dateFrom && item.dateTo === input.dateTo && input.classIds.every(id => item.classIds.includes(id))) : undefined;
        setControl(found?.id ?? null); setSelected(null);
      }} />}
    {canManage && planningJson.dialog}
    {canManage && <PlanningClassSettings classes={classes} selection={classSettings} saving={saving} onChange={setClassSettings} onClose={() => setClassSettings(null)} onSave={saveClasses} />}
  </div>;
}

export default function ExamPlanningPage() {
  const yearKey = useViewingYearKey();
  return <PlanningContent key={yearKey} />;
}
