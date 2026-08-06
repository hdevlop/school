import { Err, Service } from '@server/najm';
import { StudentRouteRepository } from './StudentRouteRepository';
import { StudentRepository } from '../../students/StudentRepository';

@Service()
export class StudentRouteValidator {
  constructor(
    private studentRouteRepository: StudentRouteRepository,
    private studentRepository: StudentRepository,
  ) {}

  async checkExists(id: string) {
    const row = await this.studentRouteRepository.getById(id);
    if (!row) Err(404, 'Student route assignment not found');
    return row;
  }

  async checkStudentNotAlreadyAssigned(studentId: string, excludeId?: string) {
    const existing = await this.studentRouteRepository.getActiveByStudentId(studentId);
    if (existing && existing.id !== excludeId) {
      Err(409, `Student is already assigned to vehicle "${existing.vehicle?.name}". Unassign first.`);
    }
  }

  private validateCoordinatePair(latitude: unknown, longitude: unknown, label: string) {
    const hasLatitude = latitude !== null && latitude !== undefined;
    const hasLongitude = longitude !== null && longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
      Err(400, `${label} latitude and longitude must be provided together.`);
    }
  }

  async validateAssignment(studentId: string, vehicleId: string, excludeId?: string) {
    const student = await this.studentRepository.getById(studentId);
    if (!student) Err(404, 'Student not found');
    if (student.status !== 'active') Err(409, 'Only active students can use school transport');

    await this.checkStudentNotAlreadyAssigned(studentId, excludeId);

    const vehicle = await this.studentRouteRepository.lockVehicle(vehicleId);
    if (!vehicle) Err(404, 'Vehicle not found');
    if (vehicle.status !== 'active') Err(409, `Vehicle "${vehicle.name}" is not active`);

    const occupancy = await this.studentRouteRepository.getActiveCountByVehicleId(vehicleId);
    const existing = excludeId ? await this.studentRouteRepository.getById(excludeId) : null;
    const alreadyOccupiesTarget = existing?.status === 'active' && existing.vehicleId === vehicleId;
    if (!alreadyOccupiesTarget && occupancy >= vehicle.capacity) {
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
