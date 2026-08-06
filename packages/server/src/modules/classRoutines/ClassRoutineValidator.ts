import { Err, Service } from '@server/najm';
import { ClassRoutineRepository } from './ClassRoutineRepository';

@Service()
export class ClassRoutineValidator {
  constructor(private repository: ClassRoutineRepository) {}

  async ensureSchedule(id: string) {
    const schedule = await this.repository.getSchedule(id);
    if (!schedule) Err(404, 'classRoutines.errors.notFound');
    return schedule;
  }

  async ensureDraft(id: string) {
    const schedule = await this.ensureSchedule(id);
    if (schedule.status !== 'draft') Err(409, 'classRoutines.errors.notEditable');
    return schedule;
  }

  async ensureEntry(scheduleId: string, entryId: string) {
    const entry = await this.repository.getEntry(entryId);
    if (!entry || entry.scheduleId !== scheduleId) Err(404, 'classRoutines.errors.entryNotFound');
    return entry;
  }

  async ensureDuty(scheduleId: string, dutyId: string) {
    const duty = await this.repository.getDuty(dutyId);
    if (!duty || duty.scheduleId !== scheduleId) Err(404, 'classRoutines.errors.dutyNotFound');
    return duty;
  }

  async ensurePeriod(id: string, allowBreak = false, scheduleId?: string) {
    const period = await this.repository.getPeriod(id);
    if (!period) Err(404, 'classRoutines.errors.periodNotFound');
    if (scheduleId && period.scheduleId && period.scheduleId !== scheduleId) {
      Err(409, 'classRoutines.errors.periodNotFound');
    }
    if (!period.isActive) Err(409, 'classRoutines.errors.periodInactive');
    if (!allowBreak && period.isBreak) Err(409, 'classRoutines.errors.breakPeriod');
    return period;
  }

  async ensurePeriodTimes(startTime: string, endTime: string, excludeId?: string) {
    if (startTime >= endTime) Err(400, 'classRoutines.errors.invalidPeriodTime');
    const periods = await this.repository.getPeriods(true);
    const overlap = periods.find((period) => period.id !== excludeId
      && period.isActive
      && startTime < period.endTime
      && endTime > period.startTime);
    if (overlap) Err(409, 'classRoutines.errors.periodConflict');
  }

  async ensureSectionAcademicYear(sectionId: string, academicYear: string) {
    const section = await this.repository.getSection(sectionId);
    if (!section) Err(404, 'classRoutines.errors.sectionNotFound');
    if (section.classAcademicYear !== academicYear) Err(409, 'classRoutines.errors.academicYearMismatch');
    return section;
  }

  async validateEntry(
    scheduleId: string,
    data: { dayOfWeek: any; periodId: string; teacherAssignmentId: string; roomNumber?: string | null },
    excludeEntryId?: string,
  ) {
    const schedule = await this.ensureSchedule(scheduleId);
    if (!schedule.activeDays.includes(data.dayOfWeek)) Err(409, 'classRoutines.errors.inactiveDay');
    const period = await this.ensurePeriod(data.periodId, false, scheduleId);
    const assignment = await this.repository.getAssignment(data.teacherAssignmentId);
    if (!assignment || assignment.sectionId !== schedule.sectionId) {
      Err(409, 'classRoutines.errors.invalidAssignment');
    }

    const ownEntries = await this.repository.getEntries(scheduleId);
    const sectionConflict = ownEntries.find((entry) => entry.id !== excludeEntryId
      && entry.dayOfWeek === data.dayOfWeek
      && entry.periodId === data.periodId);
    if (sectionConflict) Err(409, 'classRoutines.errors.sectionConflict');

    const section = await this.repository.getSection(schedule.sectionId);
    const roomNumber = data.roomNumber || section?.roomNumber || null;
    const conflicts = await this.repository.findConflicts({
      scheduleId,
      sectionId: schedule.sectionId,
      academicYear: schedule.academicYear,
      dayOfWeek: data.dayOfWeek,
      periodId: data.periodId,
      startTime: period.startTime,
      endTime: period.endTime,
      teacherId: assignment.teacherId,
      roomNumber,
      excludeEntryId,
    });
    if (conflicts.some((conflict) => conflict.teacherId === assignment.teacherId)) {
      Err(409, 'classRoutines.errors.teacherConflict');
    }
    const dutyConflicts = await this.repository.findDutyConflicts({
      scheduleId,
      academicYear: schedule.academicYear,
      dayOfWeek: data.dayOfWeek,
      staffId: assignment.teacherStaffId,
      startTime: period.startTime,
      endTime: period.endTime,
    });
    if (dutyConflicts.length) Err(409, 'classRoutines.errors.teacherConflict');
    if (roomNumber && conflicts.some((conflict) => (conflict.roomNumber || conflict.defaultRoomNumber) === roomNumber)) {
      Err(409, 'classRoutines.errors.roomConflict');
    }
    return { schedule, assignment };
  }

  async validateDuty(
    scheduleId: string,
    data: { dayOfWeek: any; periodId: string; staffId: string },
    excludeDutyId?: string,
  ) {
    const schedule = await this.ensureSchedule(scheduleId);
    if (!schedule.activeDays.includes(data.dayOfWeek)) Err(409, 'classRoutines.errors.inactiveDay');
    const period = await this.ensurePeriod(data.periodId, true, scheduleId);
    if (!period.isBreak) Err(409, 'classRoutines.errors.dutyRequiresBreak');
    const supervisor = await this.repository.getStaffSupervisor(data.staffId);
    if (!supervisor) Err(404, 'staff.errors.notFound');

    const ownDuties = await this.repository.getDuties(scheduleId);
    if (ownDuties.some((duty) => duty.id !== excludeDutyId
      && duty.dayOfWeek === data.dayOfWeek
      && duty.periodId === data.periodId)) {
      Err(409, 'classRoutines.errors.sectionConflict');
    }
    const [lessonConflicts, dutyConflicts] = await Promise.all([
      supervisor.teacherId ? this.repository.findConflicts({
        scheduleId,
        sectionId: schedule.sectionId,
        academicYear: schedule.academicYear,
        dayOfWeek: data.dayOfWeek,
        periodId: data.periodId,
        startTime: period.startTime,
        endTime: period.endTime,
        teacherId: supervisor.teacherId,
      }) : Promise.resolve([]),
      this.repository.findDutyConflicts({
        scheduleId,
        academicYear: schedule.academicYear,
        dayOfWeek: data.dayOfWeek,
        staffId: data.staffId,
        startTime: period.startTime,
        endTime: period.endTime,
        excludeDutyId,
      }),
    ]);
    if (lessonConflicts.some((conflict) => conflict.teacherId === supervisor.teacherId) || dutyConflicts.length) {
      Err(409, 'classRoutines.errors.teacherConflict');
    }
    return { schedule, period };
  }

  async validateForPublish(scheduleId: string) {
    const schedule = await this.ensureDraft(scheduleId);
    const entries = await this.repository.getEntries(scheduleId);
    if (entries.length === 0) Err(409, 'classRoutines.errors.emptySchedule');
    for (const entry of entries) {
      await this.validateEntry(scheduleId, entry, entry.id);
    }
    return schedule;
  }
}
