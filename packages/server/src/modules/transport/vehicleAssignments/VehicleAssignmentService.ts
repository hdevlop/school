import { Err, Service, Transaction } from '../../../najm';
import { VehicleAssignmentRepository } from './VehicleAssignmentRepository';
import { VehicleAssignmentValidator } from './VehicleAssignmentValidator';
import type { CreateVehicleAssignmentDto, UpdateVehicleAssignmentDto } from './VehicleAssignmentDto';
import { getBusinessDateOnly } from '../../../shared/businessDate';
import { Year } from '../../academicYears/requestYear';
import { AcademicYearValidator, type ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';

@Service()
export class VehicleAssignmentService {
  @Year() private readonly year!: ResolvedAcademicYear;
  constructor(
    private vehicleAssignmentRepository: VehicleAssignmentRepository,
    private vehicleAssignmentValidator: VehicleAssignmentValidator,
    private academicYears: AcademicYearValidator,
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
    const existing = await this.vehicleAssignmentValidator.checkAssignmentExists(id);
    if (existing.status !== 'active') Err(409, 'Driver assignment is not active');
    const effectiveDate = unassignmentDate || getBusinessDateOnly();
    if (effectiveDate < this.year.reportingStartsOn || effectiveDate > this.year.reportingEndsOn) {
      Err(409, 'Driver unassignment date is outside the selected school year');
    }
    if (effectiveDate <= existing.assignmentDate || effectiveDate > getBusinessDateOnly()) {
      Err(400, 'Driver unassignment date must follow its start and cannot be in the future');
    }

    const updateData = {
      status: 'completed',
      unassignmentDate: effectiveDate,
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

  async clearForSeedReset() {
    return this.vehicleAssignmentRepository.clearForSeedReset();
  }

  async getCount() {
    return await this.vehicleAssignmentRepository.getCount();
  }

  @Transaction()
  async assignDriver(vehicleId: string, driverId: string, assignmentDate?: string,
    assignedBy?: string, explicitYear?: ResolvedAcademicYear) {
    const effectiveDate = assignmentDate || getBusinessDateOnly();
    const year = explicitYear ?? this.year;
    this.vehicleAssignmentValidator.validateAssignmentDates(effectiveDate);
    if (effectiveDate < year.reportingStartsOn || effectiveDate > year.reportingEndsOn) {
      Err(409, 'Driver assignment date is outside the selected school year');
    }
    if (effectiveDate > getBusinessDateOnly()) Err(400, 'Driver reassignment cannot be in the future');
    const existingAssignment = await this.vehicleAssignmentRepository.getActiveAssignmentByVehicleAcrossYears(vehicleId);
    if (existingAssignment?.driverId === driverId) {
      if (effectiveDate < existingAssignment.assignmentDate) {
        Err(409, 'Driver is already assigned from a later date');
      }
      return existingAssignment;
    }
    if (existingAssignment && effectiveDate <= existingAssignment.assignmentDate) {
      Err(400, 'Driver reassignment date must follow the old start');
    }
    await this.vehicleAssignmentValidator.checkNoOverlappingVehicleAssignment(
      vehicleId, effectiveDate, null, existingAssignment?.id,
    );
    if (existingAssignment) {
      await this.vehicleAssignmentRepository.closeActiveAssignmentAcrossYears(
        existingAssignment.id, effectiveDate,
      );
    }

    const data = {
      vehicleId,
      driverId,
      assignmentDate: effectiveDate,
      status: 'active' as const,
      assignedBy: assignedBy || null,
    };

    return await this.vehicleAssignmentRepository.create(data);
  }

  async unassignDriver(vehicleId: string, unassignmentDate?: string) {
    const activeAssignment = await this.vehicleAssignmentRepository.getActiveAssignmentByVehicleAcrossYears(vehicleId);
    if (!activeAssignment) Err(404, 'Vehicle has no active driver assignment');
    return await this.unassign(activeAssignment.id, unassignmentDate);
  }

  async processDriver(vehicleId, driverData, assignmentDate?, assignedBy?) {
    if (!driverData) return [];

    const driverIds = Array.isArray(driverData)
      ? [...new Set(driverData)]
      : [driverData];

    if (driverIds.length !== 1) Err(400, 'A vehicle can have one current driver');
    const effectiveDate = assignmentDate || getBusinessDateOnly();
    this.vehicleAssignmentValidator.validateAssignmentDates(effectiveDate);
    const year = await this.academicYears.findForDate(effectiveDate);
    if (!year) Err(409, 'Driver assignment date has no registered school year');

    const assignments = [];

    for (const driverId of driverIds) {
      const assignment = await this.assignDriver(
        vehicleId,
        driverId,
        assignmentDate,
        assignedBy,
        year!,
      );
      assignments.push(assignment);
    }
    return assignments;
  }
}
