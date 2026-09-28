import { Err, Service } from '../../../najm';
import { StudentRouteRepository } from './StudentRouteRepository';
import { StudentRepository } from '../../students/StudentRepository';
import { StudentEnrollmentRepository } from '../../studentEnrollments/StudentEnrollmentRepository';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { isValidDateOnly } from '../../financial/utils/dateOnly';

@Service()
export class StudentRouteValidator {
  @Year() private readonly year!: ResolvedAcademicYear;
  constructor(
    private studentRouteRepository: StudentRouteRepository,
    private studentRepository: StudentRepository,
    private enrollments: StudentEnrollmentRepository,
  ) {}

  async checkExists(id: string) {
    const row = await this.studentRouteRepository.getById(id);
    if (!row) Err(404, 'Student route assignment not found');
    return row;
  }

  async checkStudentNotAlreadyAssigned(studentId: string, excludeId?: string) {
    const existing = await this.studentRouteRepository.getActiveByStudentIdAcrossYears(studentId);
    if (existing && existing.id !== excludeId) {
      Err(409, `Student is already assigned to vehicle "${existing.vehicle?.name}". Unassign first.`);
    }
  }

  async validateInterval(assignmentDate: string, unassignmentDate?: string | null) {
    if (!isValidDateOnly(assignmentDate)) Err(400, 'Invalid route assignment date');
    if (assignmentDate < this.year.reportingStartsOn || assignmentDate > this.year.reportingEndsOn) {
      Err(409, 'Route assignment date is outside the selected school year');
    }
    if (unassignmentDate != null &&
      (!isValidDateOnly(unassignmentDate) || unassignmentDate <= assignmentDate)) {
      Err(400, 'Route unassignment date must follow the assignment date');
    }
  }

  async validateStudentPlacement(studentId: string, date: string) {
    const enrollment = await this.enrollments.getByStudentAndYear(studentId, this.year.id);
    if (!enrollment || enrollment.enrolledOn > date || (enrollment.leftOn && enrollment.leftOn <= date)) {
      Err(409, 'Student is not enrolled on the route assignment date');
    }
    const placements = await this.enrollments.listNamedPlacements(enrollment!.id);
    if (!placements.some(row => row.validFrom <= date && (!row.validTo || row.validTo > date))) {
      Err(409, 'Student has no placement on the route assignment date');
    }
  }

  async checkNoOverlappingRoute(studentId: string, start: string, end?: string | null, excludeId?: string) {
    const overlap = await this.studentRouteRepository.getOverlappingByStudentIdAcrossYears(
      studentId, start, end, excludeId,
    );
    if (overlap) Err(409, 'Student already has a route during this date range');
  }

  private validateCoordinatePair(latitude: unknown, longitude: unknown, label: string) {
    const hasLatitude = latitude !== null && latitude !== undefined;
    const hasLongitude = longitude !== null && longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
      Err(400, `${label} latitude and longitude must be provided together.`);
    }
  }

  async validateAssignment(studentId: string, vehicleId: string, options: {
    activeToday: boolean; excludeId?: string;
  }) {
    const student = await this.studentRepository.getById(studentId);
    if (!student) Err(404, 'Student not found');
    if (options.activeToday && student.status !== 'active') Err(409, 'Only active students can use school transport');

    if (options.activeToday) await this.checkStudentNotAlreadyAssigned(studentId, options.excludeId);

    const vehicle = await this.studentRouteRepository.lockVehicle(vehicleId);
    if (!vehicle) Err(404, 'Vehicle not found');
    if (options.activeToday && vehicle.status !== 'active') Err(409, `Vehicle "${vehicle.name}" is not active`);

    const occupancy = options.activeToday
      ? await this.studentRouteRepository.getActiveCountByVehicleId(vehicleId) : 0;
    const existing = options.excludeId ? await this.studentRouteRepository.getById(options.excludeId) : null;
    const alreadyOccupiesTarget = existing?.status === 'active' && existing.vehicleId === vehicleId;
    if (options.activeToday && !alreadyOccupiesTarget && occupancy >= vehicle.capacity) {
      Err(409, `Vehicle "${vehicle.name}" is full (${occupancy}/${vehicle.capacity})`);
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
