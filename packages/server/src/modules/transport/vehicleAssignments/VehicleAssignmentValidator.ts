import { Err, I18n, Service } from '../../../najm';
import { VehicleAssignmentRepository } from './VehicleAssignmentRepository';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { isValidDateOnly } from '../../financial/utils/dateOnly';

@Service()
export class VehicleAssignmentValidator {
  @Year() private readonly year!: ResolvedAcademicYear;
  @I18n('vehicleAssignments.errors') private t!: (key: string) => string;

  constructor(
    private vehicleAssignmentRepository: VehicleAssignmentRepository,
  ) { }

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
