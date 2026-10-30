'use client';

import { useState } from 'react';
import { FileText, List, Printer, Settings } from 'lucide-react';
import { DateRangeInput, NajmScroll, NButton, NEmptyState, NErrorState, NForbiddenState, NLoadingState, NPageHeader, NPageHeaderActions, Tabs, TabsContent, TabsList, TabsTrigger } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { toast } from 'sonner';
import { compareClassNames, examPlanningMonths, toOfficialClassName, type ExamPlanningClass, type ExamPlanningEntry } from '@sms/contracts';
import { isDateOnly } from '@sms/contracts/academic-years';
import { schoolApp } from '@/najm.config';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useViewingAcademicYear, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useSchoolToday } from '@/hooks/useSchoolFormat';
import { isAuthorizationError } from '@/services/apiError';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { classDocumentColors } from '@/features/Assessments/planning/planningModel';
import { buildPlanningDocument, printPlanningDocument, type PlanningDocumentOptions } from '@/features/Assessments/planning/planningDocument';
import { PlanningPreview } from '@/features/Assessments/planning/PlanningPreview';
import { useExamPlanning } from './useExamPlanning';
import { examPlanningEntries, examPlanningRecords, initialPlanningMonth, planningMonthRange, updatePlanningMonthDraft, type ExamPlanningDrafts, type PlanningDateRange, type PlanningEntrySelection } from './examPlanningModel';
import { PlanningEntryEditor } from './PlanningEntryEditor';
import { PlanningClassSettings } from './PlanningClassSettings';
import { PlanningSchedule } from './PlanningSchedule';
import { PlanningJsonActions } from './PlanningJsonActions';
import { PlanningClearAction } from './PlanningClearAction';
import styles from './ExamPlanning.module.css';

function PlanningContent() {
  const { t, language } = useTranslation();
  const { viewingYear } = useViewingAcademicYear();
  const today = useSchoolToday();
  const viewer = useViewerRole();
  const { classes: catalog, isLoading, error, save, isSaving } = useExamPlanning();
  const { publicSettings, isSettingsLoading, error: settingsError } = usePublicSettings();
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;
  const logo = useNThemeBrandingSlot('authLogo');
  const [view, setView] = useState<'planning' | 'preview'>('planning');
  const [pickedRange, setRange] = useState<PlanningDateRange | null>(null);
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
  const range = pickedRange ?? planningMonthRange(initialMonth);
  const yearMonths = examPlanningMonths(viewingYear ?? '');
  const yearFrom = `${yearMonths[0] ?? initialMonth}-01`;
  const yearTo = planningMonthRange(yearMonths.at(-1) ?? initialMonth).to;
  const invalidRange = !isDateOnly(range.from) || !isDateOnly(range.to) || range.from > range.to || range.from < yearFrom || range.to > yearTo;
  const entriesFor = (cls: ExamPlanningClass) => examPlanningEntries(cls, range, drafts);
  const monthEntriesFor = (cls: ExamPlanningClass, month: string) => drafts[cls.id]?.[month] ?? cls.months[month] ?? [];
  const classId = pickedClass !== null && (!pickedClass || visibleClasses.some(cls => cls.id === pickedClass))
    ? pickedClass : visibleClasses.find(cls => entriesFor(cls).length)?.id ?? visibleClasses[0]?.id ?? '';
  const shownClasses = visibleClasses.filter(cls => !classId || cls.id === classId);
  const canEdit = viewer.isSchoolWide && viewer.can('update:exams');
  const defaultClass = shownClasses.find(cls => entriesFor(cls).length);
  const pickedEntryClass = selected ? shownClasses.find(cls => cls.id === selected.classId && monthEntriesFor(cls, selected.month).some(entry => entry.id === selected.entryId)) : undefined;
  const selectedClass = pickedEntryClass ?? defaultClass;
  const selectedEntry = pickedEntryClass && selected ? monthEntriesFor(pickedEntryClass, selected.month).find(entry => entry.id === selected.entryId) : selectedClass ? entriesFor(selectedClass)[0] : undefined;
  const selectedMonth = pickedEntryClass && selected ? selected.month : selectedEntry?.date.slice(0, 7);
  const effectiveSelection = selectedClass && selectedEntry && selectedMonth ? { classId: selectedClass.id, month: selectedMonth, entryId: selectedEntry.id } : null;
  const dirty = Object.keys(drafts).length > 0;
  const invalidDraft = Object.values(drafts).some(months => Object.entries(months).some(([month, entries]) => entries.some(entry => !entry.subject.trim() || !isDateOnly(entry.date) || !entry.date.startsWith(`${month}-`) || entry.lessons.filter(line => line.trim()).length > 40 || entry.lessons.some(line => line.trim().length > 500))));
  const records = invalidRange ? [] : examPlanningRecords(shownClasses, range, drafts);
  const outputDisabled = !records.length || dirty || !!error || isLoading || isSettingsLoading || !!settingsError || isPrinting || saving;
  const semesters = [...new Set(records.map(record => record.planning?.semester))];
  const documentOptions: PlanningDocumentOptions = {
    title: t('examPlanning.documentTitle'), schoolName: settings?.schoolName || schoolApp.appName,
    schoolLogo: settings?.schoolLogo || logo, academicYear: viewingYear ?? '', semester: semesters.length === 1 ? semesters[0] ?? null : null, language,
    assetOrigin: typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
    labels: { semester: t('assessmentPlanning.semester'), academicYear: t('assessmentPlanning.academicYear'), class: t('assessments.form.class'), lessons: t('assessmentPlanning.lessons'), subject: t('assessments.form.subject'), date: t('assessments.form.date'), sections: t('assessmentPlanning.sections') },
  };
  const updateEntries = (cls: ExamPlanningClass, month: string, entries: ExamPlanningEntry[]) => {
    setRange(range); setClass(classId);
    setDrafts(current => updatePlanningMonthDraft(current, cls, month, entries));
  };
  const addEntry = (cls: ExamPlanningClass) => {
    const date = today >= range.from && today <= range.to ? today : range.from;
    const month = date.slice(0, 7);
    const entry: ExamPlanningEntry = { id: crypto.randomUUID(), date, subject: t('examPlanning.newEntry'), lessons: [] };
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
    } catch { toast.error(t('examPlanning.saveFailed')); return false; }
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
  const applyAndPreview = async () => {
    if (!dirty || await saveDrafts()) setView('preview');
  };

  return <div className={styles.page} data-exam-planning>
    <NPageHeader icon={FEATURE_ICONS.assessmentPlanning} title={t('examPlanning.title')} subtitle={t('examPlanning.subtitle')}>
      <NPageHeaderActions>
        <PageHeaderGlobalActions />
      </NPageHeaderActions>
    </NPageHeader>
    <NajmScroll axis="y" autoHide="scroll" className={styles.scrollArea}>
      <main className={styles.main}>
        <Tabs value={view} onValueChange={value => setView(value as 'planning' | 'preview')} className="gap-0">
        <div className={styles.toolbar}>
          <TabsList variant="underline" aria-label={t('examPlanning.viewLabel')} className="w-auto shrink-0 border-0">
            <TabsTrigger value="planning" variant="underline" className="w-auto flex-none data-[state=active]:border-primary data-[state=active]:text-primary"><List aria-hidden="true" />{t('assessmentPlanning.planningTab')}</TabsTrigger>
            <TabsTrigger value="preview" variant="underline" className="w-auto flex-none data-[state=active]:border-primary data-[state=active]:text-primary"><FileText aria-hidden="true" />{t('assessmentPlanning.previewTab')}</TabsTrigger>
          </TabsList>
          <div className={styles.toolbarControls}>
          <fieldset className={styles.dateFilters} disabled={dirty || saving || isLoading}>
            <div className={styles.dateField}>
              <span>{t('assessmentPlanning.period')}</span>
              <DateRangeInput ariaLabel={t('assessmentPlanning.period')} className="w-80 max-sm:w-full" value={range} min={yearFrom} max={yearTo} onChange={({ from, to }) => { if (from && to) { setRange({ from, to }); setClass(classId); setSelected(null); } }} />
            </div>
          </fieldset>
          <div className={styles.toolbarActions}>
            {canEdit && <PlanningClearAction schoolYear={viewingYear ?? ''} disabled={isLoading || !!error || (!dirty && !classes.some(cls => Object.values(cls.months).some(entries => entries.length)))} saving={saving} onClear={async () => { await save({ clear: true }); discard(); setView('planning'); }} />}
            <PlanningJsonActions classes={classes} schoolYear={viewingYear ?? ''} canEdit={canEdit} disabled={dirty || saving || isLoading || !!error} saving={saving} onImport={async document => { await save({ document }); setSelected(null); }} />
            {canEdit && <NButton variant="outline" size="icon" aria-label={t('examPlanning.classSettings')} title={t('examPlanning.classSettings')} disabled={isLoading || !!error || dirty || saving} onClick={() => setClassSettings(visibleClasses.map(cls => cls.id))}><Settings className="size-4" aria-hidden="true" /></NButton>}
            <NButton variant="outline" size="icon" aria-label={t('assessmentPlanning.print')} title={t('assessmentPlanning.print')} disabled={outputDisabled} onClick={print} leftIcon={<Printer className="size-4" />} />
          </div>
          </div>
        </div>
        {error ? isAuthorizationError(error) ? <NForbiddenState surface="panel" /> : <NErrorState surface="panel" />
          : isLoading ? <NLoadingState surface="panel" label={t('common.loading')} />
            : <>
              <div className={styles.classRow} role="group" aria-label={t('assessments.form.class')}>
                <button className={styles.classButton} type="button" aria-pressed={!classId} disabled={dirty || saving} onClick={() => { setClass(''); setSelected(null); }}>{t('assessmentPlanning.allClasses')}</button>
                {visibleClasses.map(cls => <button className={styles.classButton} key={cls.id} type="button" title={cls.name} aria-pressed={classId === cls.id} disabled={dirty || saving} onClick={() => { setClass(cls.id); setSelected(null); }}><span className={styles.dot} style={{ background: classDocumentColors(cls.name)[0] }} aria-hidden="true" />{toOfficialClassName(cls.name)}</button>)}
              </div>
              {invalidRange ? <p className={styles.alert} role="alert">{t('assessmentPlanning.invalidRange')}</p>
                : !shownClasses.length ? <NEmptyState surface="panel" title={t('examPlanning.noClasses')} description={t('examPlanning.chooseClasses')} />
                : <TabsContent value={view} className="mt-0 min-w-0">
                  {view === 'preview' ? invalidDraft ? <p role="alert" className={styles.alert}>{t('examPlanning.invalidDraft')}</p>
                    : !records.length ? <NEmptyState surface="panel" title={t('examPlanning.emptyTitle')} description={t('examPlanning.emptyDescription')} />
                    : settingsError ? <NErrorState surface="panel" /> : isSettingsLoading ? <NLoadingState surface="panel" label={t('common.loading')} />
                    : <>
                      <div className={styles.paperStage}><PlanningPreview html={buildPlanningDocument(records, documentOptions)} title={t('assessmentPlanning.previewTab')} /></div>
                      <p className={styles.previewTip}>{t('examPlanning.previewTip')}</p>
                    </>
                    : <div className={styles.editorLayout}>
                      <PlanningSchedule classes={shownClasses} entriesFor={entriesFor} selected={effectiveSelection} canEdit={canEdit} saving={saving} onSelect={setSelected} onAdd={addEntry} />
                      {selectedEntry && selectedClass && selectedMonth ? <PlanningEntryEditor key={selectedClass.id + ':' + selectedMonth + ':' + selectedEntry.id} entry={selectedEntry} className={toOfficialClassName(selectedClass.name)} month={selectedMonth} disabled={saving} canEdit={canEdit} dirty={dirty} valid={!invalidDraft} onChange={updateEntry} onDelete={() => { updateEntries(selectedClass, selectedMonth, monthEntriesFor(selectedClass, selectedMonth).filter(entry => entry.id !== selectedEntry.id)); setSelected(null); }} onCancel={discard} onApply={applyAndPreview} />
                        : <aside className={styles.editPanel} aria-label={t('examPlanning.editLessons')}>
                          <p className={styles.secondary}>{t(dirty ? 'examPlanning.unsaved' : 'examPlanning.selectSubject')}</p>
                          {canEdit && dirty && <div className={styles.editorActions}>
                            <NButton variant="outline" type="button" disabled={saving} onClick={discard}>{t('common.cancel')}</NButton>
                            <NButton className={styles.applyButton} type="button" disabled={saving || invalidDraft} loading={saving} onClick={applyAndPreview}>{t('examPlanning.saveAndPreview')}</NButton>
                          </div>}
                        </aside>}
                    </div>}
                </TabsContent>}
            </>}
        </Tabs>
      </main>
    </NajmScroll>
    <PlanningClassSettings classes={classes} selection={classSettings} saving={saving} onChange={setClassSettings} onClose={() => setClassSettings(null)} onSave={saveClasses} />
  </div>;
}

export default function ExamPlanningPage() {
  const yearKey = useViewingYearKey();
  return <PlanningContent key={yearKey} />;
}
