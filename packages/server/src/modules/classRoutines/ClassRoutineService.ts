import { Err, Service, Transaction } from '@server/najm';
import { ClassRoutineRepository } from './ClassRoutineRepository';
import { ClassRoutineValidator } from './ClassRoutineValidator';
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
} from './ClassRoutineDto';

const defaultLayout: RoutineLayoutDto = { periods: [
  { type: 'lesson', name: 'Period 1', startTime: '08:00', endTime: '09:00' },
  { type: 'lesson', name: 'Period 2', startTime: '09:00', endTime: '10:00' },
  { type: 'break', name: 'Morning break', startTime: '10:00', endTime: '10:15' },
  { type: 'lesson', name: 'Period 3', startTime: '10:15', endTime: '11:15' },
  { type: 'lesson', name: 'Period 4', startTime: '11:15', endTime: '12:15' },
  { type: 'break', name: 'Lunch break', startTime: '12:15', endTime: '13:15' },
  { type: 'lesson', name: 'Period 5', startTime: '13:15', endTime: '14:15' },
  { type: 'break', name: 'Afternoon break', startTime: '14:15', endTime: '14:30' },
  { type: 'lesson', name: 'Period 6', startTime: '14:30', endTime: '15:30' },
] };

@Service()
export class ClassRoutineService {
  constructor(
    private repository: ClassRoutineRepository,
    private validator: ClassRoutineValidator,
  ) {}

  async getPeriods(includeInactive = false) {
    return this.repository.getPeriods(includeInactive);
  }

  async createPeriod(data: CreateRoutinePeriodDto) {
    await this.validator.ensurePeriodTimes(data.startTime, data.endTime);
    return this.repository.createPeriod(data);
  }

  async updatePeriod(id: string, data: UpdateRoutinePeriodDto) {
    const existing = await this.repository.getPeriod(id);
    if (!existing) return this.validator.ensurePeriod(id, true);
    await this.validator.ensurePeriodTimes(
      data.startTime ?? existing.startTime,
      data.endTime ?? existing.endTime,
      id,
    );
    return this.repository.updatePeriod(id, data);
  }

  async list(filters: RoutineListQuery) {
    return this.repository.list(filters);
  }

  async getById(id: string) {
    const [schedule, schedulePeriods, defaultPeriods] = await Promise.all([
      this.validator.ensureSchedule(id),
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

  async getAssignments(sectionId: string) {
    await this.validator.ensureSectionAcademicYear(
      sectionId,
      (await this.repository.getSection(sectionId))?.classAcademicYear ?? '',
    );
    return this.repository.getAssignmentsForSection(sectionId);
  }

  async getDutyCandidates() {
    return this.repository.getDutyCandidates();
  }

  async create(data: CreateRoutineScheduleDto) {
    await this.validator.ensureSectionAcademicYear(data.sectionId, data.academicYear);
    const existing = await this.repository.getPublishedForSection(data.sectionId, data.academicYear);
    if (existing) return this.getById(existing.id);
    const schedule = await this.repository.createSchedule({
      ...data,
      status: 'published',
      publishedAt: new Date().toISOString(),
    });
    return this.updateLayout(schedule.id, defaultLayout);
  }

  async update(id: string, data: UpdateRoutineScheduleDto) {
    await this.validator.ensureSchedule(id);
    await this.repository.updateSchedule(id, data);
    return this.getById(id);
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
    const generated = layout.periods.map((period, index) => ({
      name: period.name,
      startTime: period.startTime,
      endTime: period.endTime,
      sortOrder: index + 1,
      isBreak: period.type === 'break',
      isActive: true,
    }));
    const newLessonCount = generated.filter((period) => !period.isBreak).length;
    const oldLessonIndex = new Map(oldLessons.map((period, index) => [period.id, index]));
    const orphanedEntry = entries.find((entry) => {
      const index = oldLessonIndex.get(entry.periodId);
      return index === undefined || index >= newLessonCount;
    });
    if (orphanedEntry) Err(409, 'classRoutines.errors.layoutRemovesLessons');
    const oldBreaks = oldPeriods.filter((period) => period.isBreak);
    const oldBreakIndex = new Map(oldBreaks.map((period, index) => [period.id, index]));
    const newBreakCount = generated.filter((period) => period.isBreak).length;
    const missingDutySlot = duties.some((duty) => {
      const breakIndex = oldBreakIndex.get(duty.periodId);
      return breakIndex === undefined || breakIndex >= newBreakCount;
    });
    if (missingDutySlot) Err(409, 'classRoutines.errors.layoutRemovesDuties');

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
      const lessonIndex = oldLessonIndex.get(entry.periodId)!;
      await this.repository.updateEntryPeriod(entry.id, createdLessons[lessonIndex].id);
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

  async addEntry(scheduleId: string, data: CreateRoutineEntryDto) {
    await this.validator.validateEntry(scheduleId, data);
    const entry = await this.repository.createEntry({ scheduleId, ...data });
    return entry;
  }

  async updateEntry(scheduleId: string, entryId: string, data: UpdateRoutineEntryDto) {
    const current = await this.validator.ensureEntry(scheduleId, entryId);
    const merged = { ...current, ...data };
    await this.validator.validateEntry(scheduleId, merged, entryId);
    return this.repository.updateEntry(entryId, data);
  }

  async deleteEntry(scheduleId: string, entryId: string) {
    await this.validator.ensureSchedule(scheduleId);
    await this.validator.ensureEntry(scheduleId, entryId);
    return this.repository.deleteEntry(entryId);
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
    const current = await this.repository.getPublishedForSection(schedule.sectionId, schedule.academicYear);
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

  async getPublishedForSection(sectionId: string, academicYear?: string) {
    const schedule = await this.repository.getPublishedForSection(sectionId, academicYear);
    return schedule ? this.getById(schedule.id) : null;
  }

  async getTeacherSchedule(
    teacherId: string,
    academicYear?: string,
    user?: { role?: string; teacherId?: string },
  ) {
    if (user && !['admin', 'principal'].includes(user.role ?? '') && user.teacherId !== teacherId) {
      Err(403, 'classRoutines.errors.forbidden');
    }
    const ids = await this.repository.getTeacherScheduleIds(teacherId, academicYear);
    const schedules = await Promise.all(ids.map((id) => this.getById(id)));
    return schedules.map((schedule) => ({
      ...schedule,
      entries: schedule.entries.filter((entry) => entry.teacherId === teacherId),
      duties: schedule.duties.filter((duty) => duty.teacherId === teacherId),
    }));
  }
}
