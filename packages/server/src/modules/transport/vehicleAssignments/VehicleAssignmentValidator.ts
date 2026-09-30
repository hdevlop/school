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
    if (status !== 'active') Err(409, this.t('driverAssignmentNotActive'));
  }

  ensureUnassignmentDate(date: string, assignmentDate: string) {
    if (date < this.year.reportingStartsOn || date > this.year.reportingEndsOn) Err(409, this.t('endOutsideYear'));
    if (date <= assignmentDate || date > getBusinessDateOnly()) Err(400, this.t('endDateInvalid'));
  }

  ensureReassignmentDate(date: string, year: ResolvedAcademicYear) {
    if (date < year.reportingStartsOn || date > year.reportingEndsOn) Err(409, this.t('startOutsideYear'));
    if (date > getBusinessDateOnly()) Err(400, this.t('futureReassignment'));
  }

  ensureExistingStart(date: string, assignmentDate: string) {
    if (date < assignmentDate) Err(409, this.t('laterAssignmentExists'));
  }

  ensureReplacementStart(date: string, assignmentDate: string | undefined) {
    if (assignmentDate && date <= assignmentDate) Err(400, this.t('reassignBeforeStart'));
  }

  ensureVehicleAssignment<T>(assignment: T | null | undefined): T {
    if (!assignment) Err(404, this.t('noActiveDriver'));
    return assignment;
  }

  ensureSingleDriver(driverIds: unknown[]) {
    if (driverIds.length !== 1) Err(400, this.t('oneCurrentDriver'));
  }

  ensureRegisteredYear<T>(year: T | null | undefined): T {
    if (!year) Err(409, this.t('startNoYear'));
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
    if (overlap) Err(409, this.t('overlappingDriver'));
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
      Err(409, this.t('startOutsideYear'));
    }
    if (existing && (assignmentDate > year.reportingEndsOn ||
      (unassignmentDate != null && unassignmentDate <= year.reportingStartsOn))) {
      Err(409, this.t('mustStayInYear'));
    }
    if ((status === 'active' && unassignmentDate != null) ||
      (status !== 'active' && unassignmentDate == null)) {
      Err(400, this.t('statusEndMismatch'));
    }
    if (status !== 'cancelled') {
      await this.checkNoOverlappingVehicleAssignment(vehicleId, assignmentDate, unassignmentDate, excludeId ?? undefined);
    }
    return data;
  }
}
