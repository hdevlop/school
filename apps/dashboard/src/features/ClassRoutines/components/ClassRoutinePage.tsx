'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock3, Plus, Printer, Settings, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { ComboboxInput, NajmScroll, NButton, NEmptyState, NFilterBar, NPageHeader, NPageHeaderActions, NSheet, NSkeleton, SelectInput } from 'najm-kit';
import { useAuth } from 'najm-auth/client/react';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useActiveAcademicYear, usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useViewingAcademicYear, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import ClassRoutineSkeleton from './ClassRoutineSkeleton';
import RoutineClassSettings from './RoutineClassSettings';
import RoutineEntryForm from './RoutineEntryForm';
import RoutineDutyForm from './RoutineDutyForm';
import RoutineGrid from './RoutineGrid';
import RoutinePeriodsEditor from './RoutinePeriodsEditor';
import { RoutineDataActions } from './RoutineDataActions';
import TeacherRoutinePage from './TeacherRoutinePage';
import {
  useRoutine,
  useRoutineDetails,
  useRoutineAssignments,
  useRoutineClassSections,
  useRoutineList,
  useRoutineMutations,
  useRoutineSubjects,
} from '../hooks/useClassRoutines';
import type { RoutineDay, RoutineDuty, RoutineEntry, RoutinePeriod, RoutineSchedule } from '../types';
import type { RoutineDutyFormValues, RoutineEntryFormValues } from '../types/forms';
import { routineDayLabel, routinePeriodLabel } from '../utils/labels';
import { buildRoutineDocuments, printRoutineDocument } from '../utils/routinePrint';
import { selectRoutineSchedules } from '../utils/selectRoutineSchedules';
import { subjectColors } from '../utils/subjectColors';
import { useRoutineClassFilter } from '../hooks/useRoutineClassFilter';

const ALL_CLASSES = 'all';

function ClassRoutinePageForYear({ accountId }: { accountId: string }) {
  const { t, language } = useTranslation();
  const { can, role } = useViewerRole();
  const canCreate = can('create:class-routines');
  const canEdit = can('update:class-routines');
  const canDelete = can('delete:class-routines');
  const { academicYear, isAcademicYearLoading } = useActiveAcademicYear();
  const { publicSettings } = usePublicSettings();
  // The viewing year when whole-school history is on; otherwise the active one.
  const { viewingYear } = useViewingAcademicYear();
  const listedYear = viewingYear ?? academicYear;
  const { data: yearClasses, isPending: classSectionsPending, isError: classSectionsError, refetch: refetchClassSections } = useRoutineClassSections(listedYear);
  const { data: yearSchedules = [], isPending: schedulesPending, isFetching: schedulesFetching, isError: schedulesError, refetch: refetchSchedules } = useRoutineList(
    { academicYear: listedYear },
    Boolean(listedYear),
  );
  const routineClassIds = useMemo(() => new Set(yearSchedules.map((schedule) => schedule.classId)), [yearSchedules]);
  const routineSectionIds = useMemo(() => new Set(yearSchedules.map((schedule) => schedule.sectionId)), [yearSchedules]);
  const activeClasses = useMemo(
    () => (yearClasses?.classes || []).filter((schoolClass) => schoolClass.academicYear === listedYear && routineClassIds.has(schoolClass.id)),
    [yearClasses, listedYear, routineClassIds],
  );
  const sections = useMemo(() => (yearClasses?.sections || []).filter((section) => routineSectionIds.has(section.id)), [yearClasses, routineSectionIds]);
  const mutations = useRoutineMutations();

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const { visibleClassIds, ready: filterReady, hasSavedFilter, save: saveClassFilter } = useRoutineClassFilter(accountId, listedYear);
  const [classSelection, setClassSelection] = useState<string[] | null>(null);
  const [periodsEditor, setPeriodsEditor] = useState<{ classIds: string[]; sourceId?: string } | null>(null);
  const visibleClasses = useMemo(() => {
    if (visibleClassIds === null) return activeClasses;
    const selected = activeClasses.filter((item) => visibleClassIds.includes(item.id));
    // A saved selection from before an assignment change must not hide the
    // manager's whole floor. An explicitly empty checklist still stays empty.
    return role === 'floor_manager' && visibleClassIds.length > 0 && selected.length === 0
      ? activeClasses
      : selected;
  }, [activeClasses, visibleClassIds, role]);
  const allClasses = classId === ALL_CLASSES;
  const [selectedLesson, setSelectedLesson] = useState<{
    routine: RoutineSchedule;
    scheduleId: string;
    day: RoutineDay;
    period: RoutinePeriod;
    entry?: RoutineEntry;
  } | null>(null);
  const [selectedDuty, setSelectedDuty] = useState<{
    routine: RoutineSchedule;
    scheduleId: string;
    day: RoutineDay;
    period: RoutinePeriod;
    duty?: RoutineDuty;
  } | null>(null);

  const classSections = useMemo(
    () => (sections || []).filter((section) => !classId || section.classId === classId),
    [sections, classId],
  );
  const sectionRows = useMemo(() => visibleClasses.flatMap((schoolClass) => (sections || [])
    .filter((section) => section.classId === schoolClass.id)
    .map((section) => ({ sectionId: section.id, className: schoolClass.name, sectionName: section.name }))), [visibleClasses, sections]);
  const schedules = useMemo(() => allClasses ? yearSchedules : yearSchedules.filter((schedule) => schedule.sectionId === sectionId), [allClasses, yearSchedules, sectionId]);
  const schedulesLoading = Boolean(listedYear) && schedulesPending;
  const { data: loadedRoutine, isPending: routinePending, isFetching: routineFetching, isError: routineError } = useRoutine(allClasses ? undefined : scheduleId);
  const routine = !allClasses && loadedRoutine?.sectionId === sectionId ? loadedRoutine : null;
  const routineLoading = !allClasses && Boolean(scheduleId) && routinePending;
  const allSchedules = useMemo(() => allClasses ? selectRoutineSchedules(sectionRows.map((row) => row.sectionId), schedules) : [], [allClasses, sectionRows, schedules]);
  const allScheduleIds = allSchedules.flatMap((schedule) => schedule ? [schedule.id] : []);
  const allDetails = useRoutineDetails(allScheduleIds, listedYear);
  const detailsById = new Map(allDetails.map((detail, index) => [allScheduleIds[index], detail]));
  const printableRoutines = allClasses ? allDetails.flatMap((detail) => detail.data ? [detail.data] : []) : routine ? [routine] : [];
  const printBusy = schedulesFetching || schedulesError || (!allClasses && (routineFetching || routineError)) || allDetails.some((detail) => !detail.data || detail.isFetching || detail.isError);
  const { data: assignments = [] } = useRoutineAssignments(selectedLesson?.routine.sectionId);
  const { data: subjects = [] } = useRoutineSubjects(Boolean(selectedLesson));
  const hoursDiffer = useMemo(() => {
    if (!routine?.periods.length || !publicSettings || routine.academicYear !== academicYear) return false;
    const periods = [...routine.periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const minutes = (value: string) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
    const breaks = periods.filter((period) => period.isBreak).reduce((sum, period) => sum + minutes(period.endTime) - minutes(period.startTime), 0);
    return minutes(periods[0].startTime) !== minutes(publicSettings.schoolStartTime ?? '')
      || minutes(periods.at(-1)!.endTime) !== minutes(publicSettings.schoolEndTime ?? '')
      || breaks !== publicSettings.lunchBreakDuration;
  }, [routine, publicSettings, academicYear]);

  useEffect(() => {
    if (!filterReady || schedulesPending || classSectionsPending) return;
    setClassId((current) => current === ALL_CLASSES || activeClasses.some((item) => item.id === current)
      ? current
      : hasSavedFilter || role === 'floor_manager' ? ALL_CLASSES : (activeClasses[0]?.id || ''));
  }, [activeClasses, filterReady, hasSavedFilter, role, schedulesPending, classSectionsPending]);

  useEffect(() => {
    setSectionId((current) => classSections.some((section) => section.id === current)
      ? current
      : (classSections[0]?.id || ''));
  }, [classSections]);

  useEffect(() => {
    const preferred = schedules.find((item) => item.status === 'published')
      || schedules.find((item) => item.status === 'draft')
      || schedules[0];
    setScheduleId((current) => schedules.some((item) => item.id === current) ? current : (preferred?.id || ''));
  }, [schedules]);

  const openPeriodsForm = () => setPeriodsEditor({
    classIds: (allClasses ? visibleClasses : activeClasses.filter((item) => item.id === classId)).map((item) => item.id),
    sourceId: printableRoutines[0]?.id,
  });

  const createRoutine = async (targetSectionId: string) => {
    const selectedSection = (sections || []).find((item) => item.id === targetSectionId);
    const selectedClass = activeClasses.find((item) => item.id === selectedSection?.classId);
    if (!canCreate || !selectedSection || !selectedClass) return;
    const response: any = await mutations.createSchedule.mutateAsync({
      sectionId: targetSectionId,
      name: `${selectedClass.name} · ${selectedSection?.name || t('classRoutines.ui.title')}`,
    });
    const created = response?.data;
    if (created?.id) setScheduleId(created.id);
  };

  const openEntry = (targetRoutine: RoutineSchedule, day: RoutineDay, period: RoutinePeriod, entry?: RoutineEntry) => {
    if (!(entry ? canEdit || canDelete : canCreate)) return;
    setSelectedLesson({ routine: targetRoutine, scheduleId: targetRoutine.id, day, period, entry });
  };

  const saveLesson = async (data: RoutineEntryFormValues) => {
    if (!selectedLesson || !(selectedLesson.entry ? canEdit : canCreate)) return;
    const { scheduleId: selectedScheduleId, day, period, entry } = selectedLesson;
    const next = { ...data, dayOfWeek: day, periodId: period.id, scheduleId: selectedScheduleId };
    try {
      if (entry) await mutations.updateEntry.mutateAsync({ ...next, id: entry.id, expectedVersion: entry.version });
      else await mutations.createEntry.mutateAsync(next);
    } catch {
      return;
    }
    setSelectedLesson(null);
  };

  const deleteLesson = async () => {
    if (!canDelete || !selectedLesson?.entry) return;
    const { scheduleId: selectedScheduleId, entry } = selectedLesson;
    try {
      await mutations.deleteEntry.mutateAsync({ scheduleId: selectedScheduleId, id: entry.id, expectedVersion: entry.version });
    } catch {
      return;
    }
    setSelectedLesson(null);
  };

  const lessonBusy = mutations.createEntry.isPending || mutations.updateEntry.isPending || mutations.deleteEntry.isPending;

  const openDuty = (targetRoutine: RoutineSchedule, day: RoutineDay, period: RoutinePeriod, duty?: RoutineDuty) => {
    if (!(duty ? canEdit || canDelete : canCreate)) return;
    setSelectedDuty({ routine: targetRoutine, scheduleId: targetRoutine.id, day, period, duty });
  };

  const saveDuty = async (data: RoutineDutyFormValues) => {
    if (!selectedDuty || !(selectedDuty.duty ? canEdit : canCreate)) return;
    const { scheduleId: selectedScheduleId, day, period, duty } = selectedDuty;
    try {
      if (duty) await mutations.updateDuty.mutateAsync({ scheduleId: selectedScheduleId, id: duty.id, ...data });
      else await mutations.createDuty.mutateAsync({ scheduleId: selectedScheduleId, dayOfWeek: day, periodId: period.id, ...data });
    } catch {
      return;
    }
    setSelectedDuty(null);
  };

  const deleteDuty = async () => {
    if (!canDelete || !selectedDuty?.duty) return;
    const { scheduleId: selectedScheduleId, duty } = selectedDuty;
    try {
      await mutations.deleteDuty.mutateAsync({ scheduleId: selectedScheduleId, id: duty.id });
    } catch {
      return;
    }
    setSelectedDuty(null);
  };

  const dutyBusy = mutations.createDuty.isPending || mutations.updateDuty.isPending || mutations.deleteDuty.isPending;

  const printRoutines = async (routines: readonly RoutineSchedule[]) => {
    if (!routines.length) return;
    const html = buildRoutineDocuments(routines.map((item) => ({ data: {
      days: item.activeDays,
      periods: item.periods,
      entries: item.entries,
      duties: item.duties,
    }, options: {
      language,
      title: t('classRoutines.ui.print.title'),
      classLabel: t('classRoutines.ui.fields.class'),
      className: [item.className, item.sectionName].filter(Boolean).join(' '),
      dayHeader: t('classRoutines.ui.fields.days'),
      orLabel: t('classRoutines.ui.content.or'),
      dayLabel: (day: RoutineDay) => routineDayLabel(day, t),
      periodLabel: (period: RoutinePeriod) => routinePeriodLabel(period.name, t),
      colorOf: subjectColors(item.entries.map((entry) => ({ id: entry.subjectId, code: entry.subjectCode }))),
    } })));
    try { await printRoutineDocument(html); } catch { toast.error(t('classRoutines.ui.print.failed')); }
  };

  const busy = !filterReady || (Boolean(listedYear) && (classSectionsPending || schedulesPending)) || isAcademicYearLoading;
  const customClasses = visibleClasses.length !== activeClasses.length;
  const openClassSettings = () => setClassSelection((allClasses
    ? visibleClasses
    : activeClasses.filter((item) => item.id === classId)).map((item) => item.id));
  const applyClassSelection = () => {
    if (classSelection === null) return;
    const ids = activeClasses.filter((item) => classSelection.includes(item.id)).map((item) => item.id);
    if (!saveClassFilter(ids.length === activeClasses.length ? null : ids)) {
      toast.error(t('classRoutines.ui.classSelection.saveError'));
      return;
    }
    setClassId(ALL_CLASSES);
    setClassSelection(null);
    toast.success(t('classRoutines.ui.classSelection.saved'));
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden">
      <NPageHeader
        icon={FEATURE_ICONS.classRoutines}
        title={t('classRoutines.ui.title')}
        subtitle={t('classRoutines.ui.subtitle')}
        className="shrink-0"
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NFilterBar className="min-w-0 shrink-0">
        {busy ? (
          <>
            <NSkeleton className="h-10 min-w-0 flex-1 rounded-md lg:w-48 lg:flex-initial" />
            <NSkeleton className="h-10 min-w-0 flex-1 rounded-md lg:w-48 lg:flex-initial" />
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1 lg:w-48 lg:flex-initial">
              <ComboboxInput
                ariaLabel={t('classRoutines.ui.fields.class')}
                placeholder={t('students.filters.filterByClass')}
                value={classId}
                onChange={setClassId}
                items={[{ value: ALL_CLASSES, label: customClasses ? t('classRoutines.ui.classSelection.selected', { count: visibleClasses.length }) : t('classRoutines.ui.allClasses') }, ...activeClasses.map((item) => ({ value: item.id, label: item.name }))]}
                showIcon={false}
                className="w-full min-w-0"
              />
            </div>
            {!allClasses && <div className="min-w-0 flex-1 lg:w-48 lg:flex-initial">
              <SelectInput
                ariaLabel={t('classRoutines.ui.fields.section')}
                placeholder={t('students.filters.filterBySection')}
                value={sectionId}
                onChange={setSectionId}
                items={classSections.map((item) => ({ value: item.id, label: item.name }))}
                disabled={!classId}
                showIcon={false}
                className="w-full min-w-0"
              />
            </div>}
          </>
        )}
        <div className="flex shrink-0 justify-end gap-2 empty:hidden md:ms-auto">
          <NButton variant="outline" className="h-10 w-10 border-border p-0 text-foreground" disabled={busy || printBusy || !printableRoutines.length} onClick={() => printRoutines(printableRoutines)} aria-label={t('classRoutines.ui.actions.print')} title={t('classRoutines.ui.actions.print')}>
            <Printer className="h-4 w-4 text-foreground" />
          </NButton>
          <RoutineDataActions
            routines={printableRoutines}
            schoolYear={listedYear ?? ''}
            disabled={busy || printBusy}
            canImport={canCreate && canEdit && canDelete}
            importing={mutations.importRoutines.isPending}
            onImport={async (document) => (await mutations.importRoutines.mutateAsync(document))?.data}
          />
          {canEdit ? (
            <NButton variant="outline" className="h-10 w-10 border-border p-0 text-foreground" disabled={busy || !activeClasses.length} onClick={openPeriodsForm} aria-label={t('classRoutines.ui.actions.periods')} title={t('classRoutines.ui.actions.periods')}>
              <Clock3 className="h-4 w-4 text-foreground" />
            </NButton>
          ) : null}
          <NButton variant="outline" className="h-10 w-10 border-border p-0 text-foreground" disabled={busy} onClick={openClassSettings} aria-label={t('classRoutines.ui.classSelection.title')} title={t('classRoutines.ui.classSelection.title')} aria-haspopup="dialog" aria-expanded={classSelection !== null}>
            <Settings className="h-4 w-4 text-foreground" />
          </NButton>
        </div>
      </NFilterBar>

      {hoursDiffer && <p role="status" className="shrink-0 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">{t('classRoutines.ui.schoolHoursMismatch')}</p>}

      {busy || schedulesLoading || routineLoading ? (
        <NajmScroll axis="y" autoHide="scroll" className="flex-1">
          <ClassRoutineSkeleton />
        </NajmScroll>
      ) : classSectionsError || schedulesError ? (
        <div role="alert" className="rounded-xl border p-6 text-center">
          <p>{t('classRoutines.ui.messages.loadError')}</p>
          <NButton variant="outline" className="mt-3" onClick={() => classSectionsError ? refetchClassSections() : refetchSchedules()}>{t('classRoutines.ui.actions.retry')}</NButton>
        </div>
      ) : !activeClasses.length ? (
        <NEmptyState surface="panel" icon={FEATURE_ICONS.classRoutines} className="flex-1"
          title={t('common.feedback.emptyTitle')} />
      ) : allClasses && !visibleClasses.length ? (
        <NEmptyState surface="panel" icon={FEATURE_ICONS.classRoutines} className="flex-1"
          title={t('classRoutines.ui.classSelection.emptyTitle')} description={t('classRoutines.ui.classSelection.emptyDescription')} />
      ) : allClasses && sectionRows.length ? (
        <NajmScroll axis="y" autoHide="scroll" className="min-h-0 flex-1" key="all-classes">
          <div className="flex min-w-0 flex-col gap-8 pb-6 pe-1">
            {sectionRows.map((row, index) => {
              const summary = allSchedules[index];
              if (!summary) return null;
              const detail = summary ? detailsById.get(summary.id) : undefined;
              const week = detail?.data;
              const heading = `${row.className} · ${row.sectionName}`;
              return (
                <section key={row.sectionId} aria-label={heading} className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">{heading}</h2>
                  </div>
                  {detail?.isError ? (
                    <div role="alert" className="rounded-xl border p-4">
                      <p>{t('classRoutines.ui.messages.loadError')}</p>
                      <NButton variant="outline" size="sm" className="mt-2" onClick={() => detail.refetch()}>{t('classRoutines.ui.actions.retry')}</NButton>
                    </div>
                  ) : week ? (
                    <RoutineGrid
                      layout="stacked"
                      days={week.activeDays}
                      periods={week.periods}
                      entries={week.entries}
                      duties={week.duties}
                      defaultRoom={week.roomNumber}
                      canCreate={canCreate}
                      canUpdate={canEdit}
                      canDelete={canDelete}
                      onCellClick={(day, period, entry) => openEntry(week, day, period, entry)}
                      onDutyClick={(day, period, duty) => openDuty(week, day, period, duty)}
                    />
                  ) : <ClassRoutineSkeleton />}
                </section>
              );
            })}
          </div>
        </NajmScroll>
      ) : routine ? (
        <RoutineGrid
          key={routine.id}
          days={routine.activeDays}
          periods={routine.periods}
          entries={routine.entries}
          duties={routine.duties}
          defaultRoom={routine.roomNumber}
          canCreate={canCreate}
          canUpdate={canEdit}
          canDelete={canDelete}
          onCellClick={(day, period, entry) => openEntry(routine, day, period, entry)}
          onDutyClick={(day, period, duty) => openDuty(routine, day, period, duty)}
        />
      ) : (
        <NajmScroll axis="y" autoHide="scroll" className="flex-1 rounded-2xl border border-dashed bg-card/50">
          <div className="grid min-h-full place-items-center p-6 text-center sm:p-10">
            <div>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <FEATURE_ICONS.classRoutines className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">{t('classRoutines.ui.empty.title')}</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{t('classRoutines.ui.empty.description')}</p>
              {canCreate && sectionId ? (
                <NButton className="mt-5" onClick={() => createRoutine(sectionId)} disabled={mutations.createSchedule.isPending} leftIcon={<Plus className="h-4 w-4" />}>
                  {t('classRoutines.ui.actions.createRoutine')}
                </NButton>
              ) : null}
            </div>
          </div>
        </NajmScroll>
      )}
      <RoutineClassSettings
        classes={activeClasses}
        selection={classSelection}
        onChange={setClassSelection}
        onApply={applyClassSelection}
        onClose={() => setClassSelection(null)}
      />
      {periodsEditor ? <RoutinePeriodsEditor
        classes={activeClasses}
        initialClassIds={periodsEditor.classIds}
        initialSourceId={periodsEditor.sourceId}
        academicYear={listedYear}
        saving={mutations.updateLayouts.isPending}
        onSave={async (data) => {
          await mutations.updateLayouts.mutateAsync(data);
          setPeriodsEditor(null);
        }}
        onClose={() => setPeriodsEditor(null)}
      /> : null}
      <NSheet
        open={Boolean(selectedDuty)}
        onOpenChange={(open) => { if (!open && !dutyBusy) setSelectedDuty(null); }}
        icon={UserRound}
        title={selectedDuty?.duty
          ? t('classRoutines.ui.dialogs.editSupervision')
          : t('classRoutines.ui.dialogs.assignSupervisor', { period: selectedDuty ? routinePeriodLabel(selectedDuty.period.name, t) : '' })}
        description={selectedDuty
          ? `${selectedDuty.routine.className} ${selectedDuty.routine.sectionName} · ${routineDayLabel(selectedDuty.day, t)} · ${routinePeriodLabel(selectedDuty.period.name, t)} · ${selectedDuty.period.startTime.slice(0, 5)}–${selectedDuty.period.endTime.slice(0, 5)}`
          : undefined}
        width={560}
        classNames={{ content: 'max-w-full bg-background', body: 'p-4' }}
        footer={selectedDuty ? (
          <div className="flex w-full flex-wrap items-center gap-2">
            {selectedDuty.duty && canDelete ? (
              <NButton type="button" variant="ghost" onClick={deleteDuty} disabled={dutyBusy} leftIcon={<Trash2 className="h-4 w-4" />} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                {t('classRoutines.ui.actions.removeSupervision')}
              </NButton>
            ) : null}
            <div className="ms-auto flex gap-2">
              <NButton type="button" variant="outline" onClick={() => setSelectedDuty(null)} disabled={dutyBusy}>{t('common.cancel')}</NButton>
              {(selectedDuty.duty ? canEdit : canCreate) && <NButton type="submit" form="routine-duty-form" loading={dutyBusy} disabled={dutyBusy}>
                {selectedDuty.duty ? t('classRoutines.ui.actions.updateSupervision') : t('classRoutines.ui.actions.assignSupervisor')}
              </NButton>}
            </div>
          </div>
        ) : null}
      >
        {selectedDuty ? (
          <RoutineDutyForm
            key={`${selectedDuty.scheduleId}:${selectedDuty.day}:${selectedDuty.period.id}:${selectedDuty.duty?.id || 'new'}`}
            period={selectedDuty.period}
            duty={selectedDuty.duty}
            onSubmit={saveDuty}
            readOnly={dutyBusy || Boolean(selectedDuty.duty && !canEdit)}
            onUseForLesson={!selectedDuty.duty && canCreate && !dutyBusy ? () => {
              const { routine: dutyRoutine, day, period } = selectedDuty;
              setSelectedDuty(null);
              openEntry(dutyRoutine, day, period);
            } : undefined}
          />
        ) : null}
      </NSheet>
      <NSheet
        open={Boolean(selectedLesson)}
        onOpenChange={(open) => { if (!open && !lessonBusy) setSelectedLesson(null); }}
        icon={BookOpen}
        title={selectedLesson?.entry ? t('classRoutines.ui.dialogs.editLesson') : t('classRoutines.ui.dialogs.addLesson')}
        description={selectedLesson
          ? `${selectedLesson.routine.className} ${selectedLesson.routine.sectionName} · ${routineDayLabel(selectedLesson.day, t)} · ${routinePeriodLabel(selectedLesson.period.name, t)} · ${selectedLesson.period.startTime.slice(0, 5)}–${selectedLesson.period.endTime.slice(0, 5)}`
          : undefined}
        width={560}
        classNames={{ content: 'max-w-full bg-background', body: 'p-4' }}
        footer={selectedLesson ? (
          <div className="flex w-full flex-wrap items-center gap-2">
            {selectedLesson.entry && canDelete ? (
              <NButton type="button" variant="ghost" onClick={deleteLesson} disabled={lessonBusy} leftIcon={<Trash2 className="h-4 w-4" />} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                {t('classRoutines.ui.actions.removeLesson')}
              </NButton>
            ) : null}
            <div className="ms-auto flex gap-2">
              <NButton type="button" variant="outline" onClick={() => setSelectedLesson(null)} disabled={lessonBusy}>{t('common.cancel')}</NButton>
              {(selectedLesson.entry ? canEdit : canCreate) && <NButton type="submit" form="routine-entry-form" disabled={lessonBusy}>
                {selectedLesson.entry ? t('classRoutines.ui.actions.updateLesson') : t('classRoutines.ui.actions.addLesson')}
              </NButton>}
            </div>
          </div>
        ) : null}
      >
        {selectedLesson ? (
          <RoutineEntryForm
            key={`${selectedLesson.scheduleId}:${selectedLesson.day}:${selectedLesson.period.id}:${selectedLesson.entry?.id || 'new'}`}
            subjectOptions={subjects}
            assignmentOptions={assignments}
            otherSubjects={selectedLesson.routine.entries.filter((item) => item.id !== selectedLesson.entry?.id).map((item) => ({ id: item.subjectId, code: item.subjectCode }))}
            entry={selectedLesson.entry}
            onSubmit={saveLesson}
            readOnly={Boolean(selectedLesson.entry && !canEdit)}
          />
        ) : null}
      </NSheet>
    </div>
  );
}

export default function ClassRoutinePage() {
  const { user } = useAuth();
  const { isResolving } = useViewingAcademicYear();
  const yearKey = useViewingYearKey();
  const accountId = (user as { id?: string } | null)?.id;
  if (isResolving || !accountId) return <ClassRoutineSkeleton />;
  // A teacher plans nothing here: they see their own week.
  if ((user as any)?.role === 'teacher') return <TeacherRoutinePage key={yearKey} />;
  return <ClassRoutinePageForYear key={`${accountId}:${yearKey}`} accountId={accountId} />;
}
