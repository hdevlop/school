'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarClock, Clock3, Plus, Trash2 } from 'lucide-react';
import { ComboboxInput, NajmScroll, NButton, NFilterBar, NPageHeader, NPageHeaderActions, NSheet, NSkeleton, SelectInput } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { useAuth } from 'najm-auth/client/react';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useActiveAcademicYear, usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useViewingAcademicYear, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import ClassRoutineSkeleton from './ClassRoutineSkeleton';
import RoutineEntryForm from './RoutineEntryForm';
import RoutineDutyForm from './RoutineDutyForm';
import RoutineGrid from './RoutineGrid';
import RoutineScheduleForm from './RoutineScheduleForm';
import TeacherRoutinePage from './TeacherRoutinePage';
import {
  useRoutine,
  useRoutineAssignments,
  useRoutineList,
  useRoutineMutations,
  useRoutineSubjects,
} from '../hooks/useClassRoutines';
import type { RoutineDay, RoutineDuty, RoutineEntry, RoutinePeriod } from '../types';
import type { RoutineEntryFormValues } from '../types/forms';
import { routineDayLabel, routinePeriodLabel } from '../utils/labels';

function ClassRoutinePageForYear() {
  const { t } = useTranslation();
  const { can } = useViewerRole();
  const canCreate = can('create:class-routines');
  const canEdit = can('update:class-routines');
  const canDelete = can('delete:class-routines');
  const { openDialog } = useDialog();
  const { classes, isClassesLoading } = useClasses();
  const { academicYear, isAcademicYearLoading } = useActiveAcademicYear();
  const { publicSettings } = usePublicSettings();
  // The viewing year when whole-school history is on; otherwise the active one.
  const { viewingYear } = useViewingAcademicYear();
  const listedYear = viewingYear ?? academicYear;
  const activeClasses = useMemo(
    () => (classes || []).filter((schoolClass) => schoolClass.academicYear === listedYear),
    [classes, listedYear],
  );
  const { sections, isSectionsLoading } = useSections();
  const mutations = useRoutineMutations();

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<{
    scheduleId: string;
    day: RoutineDay;
    period: RoutinePeriod;
    entry?: RoutineEntry;
    defaultRoom?: string | null;
  } | null>(null);

  const classSections = useMemo(
    () => (sections || []).filter((section) => !classId || section.classId === classId),
    [sections, classId],
  );
  const selectedClass = activeClasses.find((item) => item.id === classId);
  const { data: schedules = [], isPending: schedulesPending } = useRoutineList(
    { sectionId, academicYear: selectedClass?.academicYear },
    Boolean(sectionId),
  );
  const schedulesLoading = Boolean(sectionId) && schedulesPending;
  const { data: routine, isPending: routinePending } = useRoutine(scheduleId);
  const routineLoading = Boolean(scheduleId) && routinePending;
  const { data: assignments = [] } = useRoutineAssignments(sectionId);
  const { data: subjects = [] } = useRoutineSubjects(Boolean(routine));
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
    setClassId((current) => activeClasses.some((item) => item.id === current)
      ? current
      : (activeClasses[0]?.id || ''));
  }, [activeClasses]);

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

  const openPeriodsForm = () => {
    if (!routine) return;
    openDialog({
      title: t('classRoutines.ui.dialogs.periodsTitle'),
      description: t('classRoutines.ui.dialogs.periodsDescription'),
      width: '4xl',
      height: 'full',
      children: <RoutineScheduleForm periods={routine.periods} />,
      primaryButton: {
        form: 'routine-schedule-form',
        text: t('classRoutines.ui.actions.savePeriods'),
        onClick: ({ periods }) => mutations.updateLayout.mutateAsync({ id: routine.id, periods }),
      },
      secondaryButton: { text: t('common.cancel') },
    });
  };

  const createRoutine = async () => {
    if (!canCreate || !sectionId || !selectedClass) return;
    const selectedSection = classSections.find((item) => item.id === sectionId);
    const response: any = await mutations.createSchedule.mutateAsync({
      sectionId,
      name: `${selectedClass.name} · ${selectedSection?.name || t('classRoutines.ui.title')}`,
    });
    const created = response?.data;
    if (created?.id) setScheduleId(created.id);
  };

  const openEntry = (day: RoutineDay, period: RoutinePeriod, entry?: RoutineEntry) => {
    if (!routine || !(entry ? canEdit || canDelete : canCreate)) return;
    setSelectedLesson({ scheduleId: routine.id, day, period, entry, defaultRoom: routine.roomNumber });
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

  const openDuty = (day: RoutineDay, period: RoutinePeriod, duty?: RoutineDuty) => {
    if (!routine || !(duty ? canEdit || canDelete : canCreate)) return;
    openDialog({
      title: duty
        ? t('classRoutines.ui.dialogs.editSupervision')
        : t('classRoutines.ui.dialogs.assignSupervisor', { period: routinePeriodLabel(period.name, t) }),
      children: (
        <RoutineDutyForm
          period={period}
          duty={duty}
          readOnly={Boolean(duty && !canEdit)}
          onUseForLesson={!duty && canCreate ? () => openEntry(day, period) : undefined}
          onDelete={duty && canDelete ? async () => {
            await mutations.deleteDuty.mutateAsync({ scheduleId: routine.id, id: duty.id });
          } : undefined}
        />
      ),
      primaryButton: (duty ? canEdit : canCreate) ? {
        form: 'routine-duty-form',
        text: duty ? t('classRoutines.ui.actions.updateSupervision') : t('classRoutines.ui.actions.assignSupervisor'),
        onClick: async (data) => {
          if (!data) return;
          if (duty) await mutations.updateDuty.mutateAsync({ scheduleId: routine.id, id: duty.id, ...data });
          else await mutations.createDuty.mutateAsync({
            scheduleId: routine.id,
            dayOfWeek: day,
            periodId: period.id,
            ...data,
          });
        },
      } : undefined,
      secondaryButton: { text: t('common.cancel') },
    });
  };

  const busy = isClassesLoading || isSectionsLoading || isAcademicYearLoading;

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden">
      <NPageHeader
        icon={CalendarClock}
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
                items={activeClasses.map((item) => ({ value: item.id, label: item.name }))}
                showIcon={false}
                className="w-full min-w-0"
              />
            </div>
            <div className="min-w-0 flex-1 lg:w-48 lg:flex-initial">
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
            </div>
          </>
        )}
        <div className="flex shrink-0 justify-end gap-2 empty:hidden md:ms-auto">
          {canEdit && routine ? (
            <>
              <NButton variant="outline" className="h-10 px-3 md:px-4" onClick={openPeriodsForm}>
                <Clock3 className="h-4 w-4" /> {t('classRoutines.ui.actions.periods')}
              </NButton>
            </>
          ) : null}
        </div>
      </NFilterBar>

      {hoursDiffer && <p role="status" className="shrink-0 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">{t('classRoutines.ui.schoolHoursMismatch')}</p>}

      {busy || schedulesLoading || routineLoading ? (
        <NajmScroll axis="y" autoHide="scroll" className="flex-1">
          <ClassRoutineSkeleton />
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
          onCellClick={openEntry}
          onDutyClick={openDuty}
        />
      ) : (
        <NajmScroll axis="y" autoHide="scroll" className="flex-1 rounded-2xl border border-dashed bg-card/50">
          <div className="grid min-h-full place-items-center p-6 text-center sm:p-10">
            <div>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <CalendarClock className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">{t('classRoutines.ui.empty.title')}</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{t('classRoutines.ui.empty.description')}</p>
              {canCreate && sectionId ? (
                <NButton className="mt-5" onClick={createRoutine} disabled={mutations.createSchedule.isPending} leftIcon={<Plus className="h-4 w-4" />}>
                  {t('classRoutines.ui.actions.createRoutine')}
                </NButton>
              ) : null}
            </div>
          </div>
        </NajmScroll>
      )}
      <NSheet
        open={Boolean(selectedLesson)}
        onOpenChange={(open) => { if (!open && !lessonBusy) setSelectedLesson(null); }}
        icon={BookOpen}
        title={selectedLesson?.entry ? t('classRoutines.ui.dialogs.editLesson') : t('classRoutines.ui.dialogs.addLesson')}
        description={selectedLesson
          ? `${routineDayLabel(selectedLesson.day, t)} · ${routinePeriodLabel(selectedLesson.period.name, t)} · ${selectedLesson.period.startTime.slice(0, 5)}–${selectedLesson.period.endTime.slice(0, 5)}`
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
            otherSubjects={routine?.entries.filter((item) => item.id !== selectedLesson.entry?.id).map((item) => ({ id: item.subjectId, code: item.subjectCode }))}
            entry={selectedLesson.entry}
            defaultRoom={selectedLesson.defaultRoom}
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
  if (isResolving) return <ClassRoutineSkeleton />;
  // A teacher plans nothing here: they see their own week.
  if ((user as any)?.role === 'teacher') return <TeacherRoutinePage key={yearKey} />;
  return <ClassRoutinePageForYear key={yearKey} />;
}
