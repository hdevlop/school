import { Service } from '@server/najm';
import { VehicleAssignmentRepository } from './VehicleAssignmentRepository';
import { VehicleAssignmentValidator } from './VehicleAssignmentValidator';
import type { CreateVehicleAssignmentDto, UpdateVehicleAssignmentDto } from './VehicleAssignmentDto';
import { getBusinessDateOnly } from '@server/shared/businessDate';

@Service()
export class VehicleAssignmentService {
  constructor(
    private vehicleAssignmentRepository: VehicleAssignmentRepository,
    private vehicleAssignmentValidator: VehicleAssignmentValidator,
  ) { }

  async getAll() {
    return await this.vehicleAssignmentRepository.getAll();
  }

  async getById(id: string) {
    await this.vehicleAssignmentValidator.checkAssignmentExists(id);
    return await this.vehicleAssignmentRepository.getById(id);
  }

  async getByVehicleId(vehicleId: string) {
    return await this.vehicleAssignmentRepository.getByVehicleId(vehicleId);
  }

  async getByDriverId(driverId: string) {
    return await this.vehicleAssignmentRepository.getByDriverId(driverId);
  }

  async create(data: CreateVehicleAssignmentDto) {
    await this.vehicleAssignmentValidator.validate(data);

    const assignmentData = {
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      assignmentDate: data.assignmentDate,
      unassignmentDate: data.unassignmentDate || null,
      status: data.status || 'active',
      notes: data.notes || null,
      assignedBy: data.assignedBy || null,
    };

    return await this.vehicleAssignmentRepository.create(assignmentData);
  }

  async update(id: string, data: UpdateVehicleAssignmentDto) {
    await this.vehicleAssignmentValidator.validate(data, id);
    return await this.vehicleAssignmentRepository.update(id, data);
  }

  async unassign(id: string, unassignmentDate?: string) {
    await this.vehicleAssignmentValidator.validateUnassignment(id);

    const updateData = {
      status: 'completed',
      unassignmentDate: unassignmentDate || getBusinessDateOnly(),
    };

    return await this.vehicleAssignmentRepository.update(id, updateData);
  }

  async delete(id: string) {
    await this.vehicleAssignmentValidator.checkAssignmentExists(id);
    return await this.vehicleAssignmentRepository.delete(id);
  }

  async deleteAll() {
    return await this.vehicleAssignmentRepository.deleteAll();
  }

  async getCount() {
    return await this.vehicleAssignmentRepository.getCount();
  }

  async assignDriver(vehicleId: string, driverId: string, assignmentDate?: string, assignedBy?: string) {
    const existingAssignment = await this.vehicleAssignmentRepository.getActiveAssignmentByVehicle(vehicleId);
    if (existingAssignment) {
      return await this.vehicleAssignmentRepository.update(existingAssignment.id, {
        driverId,
        assignmentDate: assignmentDate || existingAssignment.assignmentDate,
        assignedBy: assignedBy || existingAssignment.assignedBy,
      });
    }

    const data = {
      vehicleId,
      driverId,
      assignmentDate: assignmentDate || getBusinessDateOnly(),
      status: 'active' as const,
      assignedBy: assignedBy || null,
    };

    return await this.create(data);
  }

  async unassignDriver(vehicleId: string, unassignmentDate?: string) {
    const activeAssignment = await this.vehicleAssignmentRepository.getActiveAssignmentByVehicle(vehicleId);
    return await this.unassign(activeAssignment.id, unassignmentDate);
  }

  async processDriver(vehicleId, driverData, assignmentDate?, assignedBy?) {
    if (!driverData) return [];

    const driverIds = Array.isArray(driverData)
      ? [...new Set(driverData)]
      : [driverData];

    const assignments = [];

    for (const driverId of driverIds) {
      const assignment = await this.assignDriver(
        vehicleId,
        driverId,
        assignmentDate,
        assignedBy
      );
      assignments.push(assignment);
    }
    return assignments;
  }
}
