import { Service, Transaction } from '../../najm';
import { ClassRoutineRepository, type RoutineReader } from './ClassRoutineRepository';
import { ClassRoutineValidator } from './ClassRoutineValidator';
import { schoolDayPeriods } from '@sms/contracts/routines';
import { routineNameKey, type RoutineJson, type RoutineJsonLesson } from '@sms/contracts';
import type {
  CreateRoutineEntryDto,
  CreateRoutineDutyDto,
  CreateRoutinePeriodDto,
  CreateRoutineScheduleDto,
  RoutineListQuery,
  UpdateRoutineEntryDto,
  UpdateRoutineDutyDto,
  UpdateRoutinePeriodDto,
  UpdateRoutineScheduleDto,
  RoutineLayoutDto,
  RoutineBulkLayoutDto,
} from './ClassRoutineDto';

@Service()
export class ClassRoutineService {
  constructor(
    private repository: ClassRoutineRepository,
    private validator: ClassRoutineValidator,
  ) {}

  @Transaction()
  async clearForSeedReset() {
    await this.repository.clearForSeedReset();
  }

  async getPeriods(includeInactive = false) {
    return this.repository.getPeriods(includeInactive);
  }

  async getTeachingDays() {
    return this.repository.getSchoolTeachingDays();
  }

  async createPeriod(data: CreateRoutinePeriodDto) {
    await this.validator.ensurePeriodTimes(data.startTime, data.endTime);
    return this.repository.createPeriod(data);
  }

  async updatePeriod(id: string, data: UpdateRoutinePeriodDto) {
    const existing = await this.repository.getPeriod(id);
    if (!existing) return this.validator.ensurePeriod(id);
    await this.validator.ensurePeriodTimes(
      data.startTime ?? existing.startTime,
      data.endTime ?? existing.endTime,
      id,
    );
    return this.repository.updatePeriod(id, data);
  }

  // Every read and change works in the selected year: a timetable belongs to
  // its class's year, stored on it.
  async list(filters: RoutineListQuery) {
    return this.repository.list(filters);
  }

  async getById(id: string) {
    const schedule = await this.validator.ensureSchedule(id);
    const [schedulePeriods, defaultPeriods] = await Promise.all([
      this.repository.getPeriods(false, id),
      this.repository.getPeriods(),
    ]);
    const [entries, duties] = await Promise.all([
      this.repository.getEntries(id),
      this.repository.getDuties(id),
    ]);
    const periods = schedulePeriods.length ? schedulePeriods : defaultPeriods;
    return { ...schedule, periods, entries, duties };
  }

  // Resolve filters under timetable access, without a second classes grant.
  // Floor managers retain the same assigned-grade selection as their roster.
  async getClassSections(reader?: RoutineReader) {
    const [classRows, sectionRows] = await Promise.all([
      this.repository.getClassesInSelectedYear(reader),
      this.repository.getClassSectionsInSelectedYear(reader),
    ]);
    return { classes: classRows, sections: sectionRows };
  }

  async getAssignments(sectionId: string) {
    await this.validator.ensureSectionInSelectedYear(sectionId);
    return this.repository.getAssignmentsForSection(sectionId);
  }

  async getSubjects() {
    return this.repository.getSubjects();
  }

  async getDutyCandidates() {
    return this.repository.getDutyCandidates();
  }

  // A new timetable takes the selected year; its section must be that year's.
  async create(data: CreateRoutineScheduleDto) {
    await this.validator.ensureSectionInSelectedYear(data.sectionId);
    const existing = await this.repository.getPublishedForSection(data.sectionId);
    if (existing) return this.getById(existing.id);
    const periods = schoolDayPeriods(await this.repository.getSchoolDay());
    const schedule = await this.repository.createSchedule({
      ...data,
      activeDays: await this.repository.getSchoolTeachingDays(),
      status: 'published',
      publishedAt: new Date().toISOString(),
    });
    return this.updateLayout(schedule.id, { periods });
  }

  async update(id: string, data: UpdateRoutineScheduleDto) {
    await this.validator.ensureSchedule(id);
    await this.repository.updateSchedule(id, data);
    return this.getById(id);
  }

  /** Nested layout updates share this transaction: one refusal rolls back the whole selection. */
  @Transaction()
  async updateLayouts({ scheduleIds, periods }: RoutineBulkLayoutDto) {
    const ids = [...new Set(scheduleIds)];
    // Check every target in the selected year before making the first change.
    for (const id of ids) await this.validator.ensureSchedule(id);
    for (const id of ids) await this.updateLayout(id, { periods });
    return { updated: ids.length };
  }

  @Transaction()
  async updateLayout(id: string, layout: RoutineLayoutDto) {
    await this.validator.ensureSchedule(id);
    const [ownedPeriods, defaultPeriods, entries, duties] = await Promise.all([
      this.repository.getPeriods(true, id),
      this.repository.getPeriods(true),
      this.repository.getEntries(id),
      this.repository.getDuties(id),
    ]);
    const oldPeriods = ownedPeriods.length ? ownedPeriods : defaultPeriods;
    const oldLessons = oldPeriods.filter((period) => !period.isBreak);
    const oldBreaks = oldPeriods.filter((period) => period.isBreak);
    const generated = layout.periods.map((period, index) => ({
      name: period.name,
      startTime: period.startTime,
      endTime: period.endTime,
      sortOrder: index + 1,
      isBreak: period.type === 'break',
      isActive: true,
    }));
    const newLessonCount = generated.filter((period) => !period.isBreak).length;
    const newBreakCount = generated.filter((period) => period.isBreak).length;
    const oldLessonIndex = new Map(oldLessons.map((period, index) => [period.id, index]));
    const oldBreakIndex = new Map(oldBreaks.map((period, index) => [period.id, index]));
    // A lesson keeps its place among the lessons, or among the breaks when a
    // break holds it.
    const entrySlot = (periodId: string) => oldLessonIndex.has(periodId)
      ? { isBreak: false, index: oldLessonIndex.get(periodId)! }
      : oldBreakIndex.has(periodId) ? { isBreak: true, index: oldBreakIndex.get(periodId)! } : undefined;
    const orphanedEntry = entries.find((entry) => {
      const slot = entrySlot(entry.periodId);
      return !slot || slot.index >= (slot.isBreak ? newBreakCount : newLessonCount);
    });
    this.validator.ensureLayoutKeepsLessons(orphanedEntry);
    const missingDutySlot = duties.some((duty) => {
      const breakIndex = oldBreakIndex.get(duty.periodId);
      return breakIndex === undefined || breakIndex >= newBreakCount;
    });
    this.validator.ensureLayoutKeepsDuties(missingDutySlot);

    const created = await this.repository.createPeriods(generated.map((period) => ({
      ...period,
      scheduleId: id,
      sortOrder: period.sortOrder + 1000,
    })));
    const createdLessons = created
      .filter((period) => !period.isBreak)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const createdBreaks = created
      .filter((period) => period.isBreak)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    for (const entry of entries) {
      const slot = entrySlot(entry.periodId)!;
      await this.repository.updateEntryPeriod(entry.id, (slot.isBreak ? createdBreaks : createdLessons)[slot.index].id);
    }
    for (const duty of duties) {
      const nextPeriod = createdBreaks[oldBreakIndex.get(duty.periodId)!];
      await this.repository.updateDutyPeriod(duty.id, nextPeriod.id);
    }
    await this.repository.deletePeriods(ownedPeriods.map((period) => period.id));
    for (const period of created) {
      await this.repository.updatePeriod(period.id, { sortOrder: period.sortOrder - 1000 });
    }
    return this.getById(id);
  }

  /**
   * Replaces the timetables a file names, in the selected year, or none:
   * every lesson and supervision goes through the same rules as one added by
   * hand. Names identify classes, subjects and people; a teacher who does not
   * teach that subject in the section is left off the lesson and counted.
   */
  @Transaction()
  async importDocument(document: RoutineJson) {
    this.validator.ensureImportYear(document.schoolYear);
    const [sectionRows, subjectRows, staffRows, teachingDays] = await Promise.all([
      this.repository.getSectionsInSelectedYear(),
      this.repository.getSubjects(),
      this.repository.getDutyCandidates(),
      this.repository.getSchoolTeachingDays(),
    ]);
    const byName = <Row>(rows: Row[], name: (row: Row) => string | null | undefined, value: string) =>
      rows.filter((row) => routineNameKey(name(row) ?? '') === routineNameKey(value));
    const subjectFor = (lesson: RoutineJsonLesson) => {
      const byCode = lesson.subjectCode ? byName(subjectRows, (row) => row.code, lesson.subjectCode) : [];
      const named = byName(subjectRows, (row) => row.name, lesson.subject);
      return byCode.length === 1 ? byCode[0] : named.length === 1 ? named[0] : undefined;
    };

    // Resolve every name before the first change.
    const plans = document.routines.map((routine) => {
      const label = `${routine.className} ${routine.sectionName}`;
      const section = this.validator.ensureImportSection(
        sectionRows.filter((row) => routineNameKey(row.className) === routineNameKey(routine.className)
          && routineNameKey(row.name) === routineNameKey(routine.sectionName)),
        label,
      );
      const lessons = routine.lessons.map((lesson) => ({ lesson, subject: this.validator.ensureImportSubject(subjectFor(lesson), lesson.subject) }));
      const duties = routine.duties.map((duty) => {
        const matches = byName(staffRows, (row) => row.staffName, duty.staff);
        return { duty, staff: this.validator.ensureImportStaff(matches.length === 1 ? matches[0] : undefined, duty.staff) };
      });
      return { routine, label, section, lessons, duties };
    });

    // Clear every target first, so lessons moving between imported sections never meet their old copies.
    const scheduleIds: string[] = [];
    for (const plan of plans) {
      const existing = await this.repository.getPublishedForSection(plan.section.id);
      const id = existing?.id ?? (await this.repository.createSchedule({
        sectionId: plan.section.id,
        name: plan.routine.name,
        activeDays: teachingDays,
        status: 'published',
        publishedAt: new Date().toISOString(),
      })).id;
      await this.repository.clearScheduleContent(id);
      await this.repository.updateSchedule(id, { name: plan.routine.name });
      scheduleIds.push(id);
    }

    let lessons = 0;
    let duties = 0;
    let teachersNotAssigned = 0;
    for (const [index, plan] of plans.entries()) {
      const id = scheduleIds[index];
      try {
        const { periods } = await this.updateLayout(id, { periods: plan.routine.periods.map(({ type, name, startTime, endTime }) => ({ type, name, startTime, endTime })) });
        const periodAt = (position: number) => periods[position - 1].id;
        const assignments = await this.repository.getAssignmentsForSection(plan.section.id);
        for (const { lesson, subject } of plan.lessons) {
          const assignment = lesson.teacher
            ? assignments.find((row) => row.subjectId === subject.id && routineNameKey(row.teacherName) === routineNameKey(lesson.teacher!))
            : undefined;
          if (lesson.teacher && !assignment) teachersNotAssigned++;
          await this.addEntry(id, {
            dayOfWeek: lesson.day,
            periodId: periodAt(lesson.period),
            subjectId: subject.id,
            teacherAssignmentId: assignment?.id ?? null,
            roomNumber: lesson.roomNumber,
            notes: lesson.notes,
            contentGroups: lesson.contentGroups,
          });
          lessons++;
        }
        for (const { duty, staff } of plan.duties) {
          await this.addDuty(id, { dayOfWeek: duty.day, periodId: periodAt(duty.period), staffId: staff.staffId, notes: duty.notes });
          duties++;
        }
      } catch (error) {
        this.validator.refuseImportOf(plan.label, error);
      }
    }
    return { routines: plans.length, lessons, duties, teachersNotAssigned };
  }

  async addEntry(scheduleId: string, data: CreateRoutineEntryDto) {
    await this.validator.validateEntry(scheduleId, data);
    const entry = await this.repository.createEntry({
      scheduleId,
      ...data,
      teacherAssignmentId: data.teacherAssignmentId || null,
      roomNumber: data.roomNumber || null,
      contentGroups: data.contentGroups ?? [],
    });
    return entry;
  }

  async updateEntry(scheduleId: string, entryId: string, data: UpdateRoutineEntryDto) {
    const current = await this.validator.ensureEntry(scheduleId, entryId);
    this.validator.ensureEntryVersion(current.version, data.expectedVersion, data.contentGroups !== undefined);
    const merged = { ...current, ...data };
    await this.validator.validateEntry(scheduleId, merged, entryId);
    const { expectedVersion: _expectedVersion, ...changes } = data;
    if (changes.roomNumber !== undefined) changes.roomNumber = changes.roomNumber || null;
    const updated = await this.repository.updateEntryIfVersion(entryId, current.version, changes);
    return this.validator.ensureEntryWriteSucceeded(updated);
  }

  async deleteEntry(scheduleId: string, entryId: string, expectedVersion?: number) {
    await this.validator.ensureSchedule(scheduleId);
    const current = await this.validator.ensureEntry(scheduleId, entryId);
    this.validator.ensureEntryVersion(current.version, expectedVersion, current.contentGroups.length > 0);
    const deleted = await this.repository.deleteEntryIfVersion(entryId, current.version);
    return this.validator.ensureEntryWriteSucceeded(deleted);
  }

  async addDuty(scheduleId: string, data: CreateRoutineDutyDto) {
    await this.validator.validateDuty(scheduleId, data);
    return this.repository.createDuty({ scheduleId, ...data });
  }

  async updateDuty(scheduleId: string, dutyId: string, data: UpdateRoutineDutyDto) {
    const current = await this.validator.ensureDuty(scheduleId, dutyId);
    const merged = { ...current, ...data };
    await this.validator.validateDuty(scheduleId, merged, dutyId);
    return this.repository.updateDuty(dutyId, data);
  }

  async deleteDuty(scheduleId: string, dutyId: string) {
    await this.validator.ensureSchedule(scheduleId);
    await this.validator.ensureDuty(scheduleId, dutyId);
    return this.repository.deleteDuty(dutyId);
  }

  @Transaction()
  async publish(id: string, userId: string) {
    const schedule = await this.validator.validateForPublish(id);
    const current = await this.repository.getPublishedForSection(schedule.sectionId);
    if (current && current.id !== id) {
      await this.repository.updateSchedule(current.id, { status: 'archived' });
    }
    await this.repository.updateSchedule(id, {
      status: 'published',
      publishedAt: new Date().toISOString(),
      publishedBy: userId,
    });
    return this.getById(id);
  }

  async archive(id: string) {
    await this.validator.ensureSchedule(id);
    await this.repository.updateSchedule(id, { status: 'archived' });
    return this.getById(id);
  }

  async delete(id: string) {
    await this.validator.ensureDraft(id);
    return this.repository.deleteSchedule(id);
  }

  async getPublishedForSection(sectionId: string) {
    const schedule = await this.repository.getPublishedForSection(sectionId);
    return schedule ? this.getById(schedule.id) : null;
  }

  // The session carries no teacher id: a signed-in teacher is found from
  // their account, so they can read their own week and no one else's.
  async getTeacherSchedule(teacherId: string, user?: { id?: string; role?: string; teacherId?: string }) {
    const viewerTeacherId = user?.role === 'teacher' && user.id
      ? await this.repository.teacherIdForUser(user.id) ?? undefined
      : user?.teacherId;
    this.validator.ensureTeacherScheduleAccess(teacherId, user && { role: user.role, teacherId: viewerTeacherId });
    const ids = await this.repository.getTeacherScheduleIdsInSelectedYear(teacherId);
    const schedules = await Promise.all(ids.map((id) => this.getById(id)));
    return schedules.map((schedule) => ({
      ...schedule,
      entries: schedule.entries.filter((entry) => entry.teacherId === teacherId),
      duties: schedule.duties.filter((duty) => duty.teacherId === teacherId),
    }));
  }
}
