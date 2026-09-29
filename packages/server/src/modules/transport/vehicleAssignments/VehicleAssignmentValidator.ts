import { Err, I18n, Service } from '../../../najm';
import { VehicleAssignmentRepository } from './VehicleAssignmentRepository';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { isValidDateOnly } from '../../financial/utils/dateOnly';
import { getBusinessDateOnly } from '../../../shared/businessDate';

@Service()
export class VehicleAssignmentValidator {
  @Year() private readonly year!: ResolvedAcademicYear;
  @I18n('vehicleAssignments.errors') private t!: (key: string) => string;

  constructor(
    private vehicleAssignmentRepository: VehicleAssignmentRepository,
  ) { }

  ensureActiveAssignment(status: string) {
    if (status !== 'active') Err(409, 'Driver assignment is not active');
  }

  ensureUnassignmentDate(date: string, assignmentDate: string) {
    if (date < this.year.reportingStartsOn || date > this.year.reportingEndsOn) Err(409, 'Driver unassignment date is outside the selected school year');
    if (date <= assignmentDate || date > getBusinessDateOnly()) Err(400, 'Driver unassignment date must follow its start and cannot be in the future');
  }

  ensureReassignmentDate(date: string, year: ResolvedAcademicYear) {
    if (date < year.reportingStartsOn || date > year.reportingEndsOn) Err(409, 'Driver assignment date is outside the selected school year');
    if (date > getBusinessDateOnly()) Err(400, 'Driver reassignment cannot be in the future');
  }

  ensureExistingStart(date: string, assignmentDate: string) {
    if (date < assignmentDate) Err(409, 'Driver is already assigned from a later date');
  }

  ensureReplacementStart(date: string, assignmentDate: string | undefined) {
    if (assignmentDate && date <= assignmentDate) Err(400, 'Driver reassignment date must follow the old start');
  }

  ensureVehicleAssignment<T>(assignment: T | null | undefined): T {
    if (!assignment) Err(404, 'Vehicle has no active driver assignment');
    return assignment;
  }

  ensureSingleDriver(driverIds: unknown[]) {
    if (driverIds.length !== 1) Err(400, 'A vehicle can have one current driver');
  }

  ensureRegisteredYear<T>(year: T | null | undefined): T {
    if (!year) Err(409, 'Driver assignment date has no registered school year');
    return year;
  }

  async checkAssignmentExists(id: string) {
    const assignment = await this.vehicleAssignmentRepository.getById(id);
    if (!assignment) {
      Err(404, this.t('notFound'));
    }
    return assignment;
  }

  validateAssignmentDates(assignmentDate: string, unassignmentDate?: string | null) {
    if (!isValidDateOnly(assignmentDate) ||
      (unassignmentDate != null && (!isValidDateOnly(unassignmentDate) || unassignmentDate <= assignmentDate))) {
      Err(400, this.t('invalidDateRange'));
    }
  }

  async checkNoOverlappingVehicleAssignment(
    vehicleId: string, assignmentDate: string, unassignmentDate?: string | null, excludeId?: string,
  ) {
    const overlap = await this.vehicleAssignmentRepository.getOverlappingByVehicleAcrossYears(
      vehicleId, assignmentDate, unassignmentDate, excludeId,
    );
    if (overlap) Err(409, 'Vehicle already has a driver during this date range');
  }

  async validateUnassignment(id: string) {
    const assignment = await this.checkAssignmentExists(id);

    if (assignment.status !== 'active') {
      Err(400, this.t('assignmentNotActive'));
    }

    return true;
  }

  async validate(data: Record<string, unknown>, excludeId: string | null = null,
    explicitYear?: ResolvedAcademicYear) {
    const existing = excludeId ? await this.checkAssignmentExists(excludeId) : null;
    const year = explicitYear ?? this.year;
    const assignmentDate = (data.assignmentDate ?? existing?.assignmentDate) as string;
    const unassignmentDate = (data.unassignmentDate === undefined
      ? existing?.unassignmentDate : data.unassignmentDate) as string | null | undefined;
    const vehicleId = (data.vehicleId ?? existing?.vehicleId) as string;
    const status = (data.status ?? existing?.status ?? 'active') as string;
    this.validateAssignmentDates(assignmentDate, unassignmentDate);
    if (!existing && (assignmentDate < year.reportingStartsOn || assignmentDate > year.reportingEndsOn)) {
      Err(409, 'Driver assignment date is outside the selected school year');
    }
    if (existing && (assignmentDate > year.reportingEndsOn ||
      (unassignmentDate != null && unassignmentDate <= year.reportingStartsOn))) {
      Err(409, 'Driver assignment must remain in the selected school year');
    }
    if ((status === 'active' && unassignmentDate != null) ||
      (status !== 'active' && unassignmentDate == null)) {
      Err(400, 'Driver assignment status and end date disagree');
    }
    if (status !== 'cancelled') {
      await this.checkNoOverlappingVehicleAssignment(vehicleId, assignmentDate, unassignmentDate, excludeId ?? undefined);
    }
    return data;
  }
}
