import { Err, I18n, Service } from '../../../najm';
import { StudentRouteRepository } from './StudentRouteRepository';
import { StudentRepository } from '../../students/StudentRepository';
import { StudentEnrollmentRepository } from '../../studentEnrollments/StudentEnrollmentRepository';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { isValidDateOnly } from '../../financial/utils/dateOnly';
import { getBusinessDateOnly } from '../../../shared/businessDate';

@Service()
export class StudentRouteValidator {
  @I18n('studentRoutes.errors') private et!: (key: string, params?: Record<string, unknown>) => string;
  @Year() private readonly year!: ResolvedAcademicYear;
  constructor(
    private studentRouteRepository: StudentRouteRepository,
    private studentRepository: StudentRepository,
    private enrollments: StudentEnrollmentRepository,
  ) {}

  ensureStatusDates(status: string, unassignmentDate?: string | null) {
    if (status === 'active' && unassignmentDate) Err(400, this.et('activeHasNoEnd'));
    if (status !== 'active' && !unassignmentDate) Err(400, this.et('closedNeedsEnd'));
  }

  ensureReassignable(status: string) {
    if (status !== 'active') Err(409, this.et('reassignActiveOnly'));
  }

  ensureReassignmentDate(date: string, assignmentDate: string) {
    if (date <= assignmentDate || date > getBusinessDateOnly()) Err(400, this.et('reassignDateInvalid'));
  }

  ensureActiveRoute(status: string) {
    if (status !== 'active') Err(409, this.et('notActive'));
  }

  ensureUnassignmentDate(date: string, assignmentDate: string) {
    if (date < this.year.reportingStartsOn || date > this.year.reportingEndsOn) Err(409, this.et('endOutsideYear'));
    if (date <= assignmentDate || date > getBusinessDateOnly()) Err(400, this.et('endDateInvalid'));
  }

  ensureTransportFeeType<T>(feeType: T | null | undefined): T {
    if (!feeType) Err(409, this.et('noTransportFeeType'));
    return feeType;
  }

  async checkExists(id: string) {
    const row = await this.studentRouteRepository.getById(id);
    if (!row) Err(404, this.et('notFound'));
    return row;
  }

  async checkStudentNotAlreadyAssigned(studentId: string, excludeId?: string) {
    const existing = await this.studentRouteRepository.getActiveByStudentIdAcrossYears(studentId);
    if (existing && existing.id !== excludeId) {
      Err(409, this.et('alreadyOnVehicle', { vehicle: existing.vehicle?.name }));
    }
  }

  async validateInterval(assignmentDate: string, unassignmentDate?: string | null) {
    if (!isValidDateOnly(assignmentDate)) Err(400, this.et('invalidStartDate'));
    if (assignmentDate < this.year.reportingStartsOn || assignmentDate > this.year.reportingEndsOn) {
      Err(409, this.et('startOutsideYear'));
    }
    if (unassignmentDate != null &&
      (!isValidDateOnly(unassignmentDate) || unassignmentDate <= assignmentDate)) {
      Err(400, this.et('endBeforeStart'));
    }
  }

  async validateStudentPlacement(studentId: string, date: string) {
    const enrollment = await this.enrollments.getByStudentAndYear(studentId, this.year.id);
    if (!enrollment || enrollment.enrolledOn > date || (enrollment.leftOn && enrollment.leftOn <= date)) {
      Err(409, this.et('notEnrolledOnStart'));
    }
    const placements = await this.enrollments.listNamedPlacements(enrollment!.id);
    if (!placements.some(row => row.validFrom <= date && (!row.validTo || row.validTo > date))) {
      Err(409, this.et('noPlacementOnStart'));
    }
  }

  async checkNoOverlappingRoute(studentId: string, start: string, end?: string | null, excludeId?: string) {
    const overlap = await this.studentRouteRepository.getOverlappingByStudentIdAcrossYears(
      studentId, start, end, excludeId,
    );
    if (overlap) Err(409, this.et('overlappingRoute'));
  }

  private validateCoordinatePair(latitude: unknown, longitude: unknown, label: string) {
    const hasLatitude = latitude !== null && latitude !== undefined;
    const hasLongitude = longitude !== null && longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
      Err(400, this.et('coordinatesTogether', { label }));
    }
  }

  async validateAssignment(studentId: string, vehicleId: string, options: {
    activeToday: boolean; excludeId?: string;
  }) {
    const student = await this.studentRepository.getById(studentId);
    if (!student) Err(404, this.et('studentNotFound'));
    if (options.activeToday && student.status !== 'active') Err(409, this.et('studentInactive'));

    if (options.activeToday) await this.checkStudentNotAlreadyAssigned(studentId, options.excludeId);

    const vehicle = await this.studentRouteRepository.lockVehicle(vehicleId);
    if (!vehicle) Err(404, this.et('vehicleNotFound'));
    if (options.activeToday && vehicle.status !== 'active') Err(409, this.et('vehicleInactive', { vehicle: vehicle.name }));

    const occupancy = options.activeToday
      ? await this.studentRouteRepository.getActiveCountByVehicleId(vehicleId) : 0;
    const existing = options.excludeId ? await this.studentRouteRepository.getById(options.excludeId) : null;
    const alreadyOccupiesTarget = existing?.status === 'active' && existing.vehicleId === vehicleId;
    if (options.activeToday && !alreadyOccupiesTarget && occupancy >= vehicle.capacity) {
      Err(409, this.et('vehicleFull', { vehicle: vehicle.name, occupancy, capacity: vehicle.capacity }));
    }

    return { student, vehicle, occupancy };
  }

  async validate(data: Record<string, unknown>, excludeId?: string | null) {
    if (excludeId) await this.checkExists(excludeId);
    this.validateCoordinatePair(data.pickupLatitude, data.pickupLongitude, 'Pickup location');
    this.validateCoordinatePair(data.dropoffLatitude, data.dropoffLongitude, 'Drop-off location');
    return data;
  }
}
