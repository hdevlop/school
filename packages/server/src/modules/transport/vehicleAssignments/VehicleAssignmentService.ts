import { Service, Transaction } from '../../../najm';
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
    this.vehicleAssignmentValidator.ensureActiveAssignment(existing.status);
    const effectiveDate = unassignmentDate || getBusinessDateOnly();
    this.vehicleAssignmentValidator.ensureUnassignmentDate(effectiveDate, existing.assignmentDate);

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
    this.vehicleAssignmentValidator.ensureReassignmentDate(effectiveDate, year);
    const existingAssignment = await this.vehicleAssignmentRepository.getActiveAssignmentByVehicleAcrossYears(vehicleId);
    if (existingAssignment?.driverId === driverId) {
      this.vehicleAssignmentValidator.ensureExistingStart(effectiveDate, existingAssignment.assignmentDate);
      return existingAssignment;
    }
    this.vehicleAssignmentValidator.ensureReplacementStart(effectiveDate, existingAssignment?.assignmentDate);
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

  /**
   * The Staff form's vehicle for a driver, from the business day: the driver's
   * other current vehicle ends today and the vehicle's other driver is replaced
   * by `assignDriver`. Earlier assignments are never rewritten or deleted.
   */
  @Transaction()
  async assignDriverFromToday(driverId: string, vehicleId: string) {
    const today = getBusinessDateOnly();
    const year = this.vehicleAssignmentValidator.ensureRegisteredYear(await this.academicYears.findForDate(today));
    const current = await this.vehicleAssignmentRepository.getActiveAssignmentByDriverAcrossYears(driverId);
    if (current?.vehicleId === vehicleId) return current;
    if (current) await this.vehicleAssignmentRepository.closeActiveAssignmentAcrossYears(current.id, today);
    return await this.assignDriver(vehicleId, driverId, today, undefined, year);
  }

  async unassignDriver(vehicleId: string, unassignmentDate?: string) {
    const activeAssignment = this.vehicleAssignmentValidator.ensureVehicleAssignment(
      await this.vehicleAssignmentRepository.getActiveAssignmentByVehicleAcrossYears(vehicleId),
    );
    return await this.unassign(activeAssignment.id, unassignmentDate);
  }

  async processDriver(vehicleId, driverData, assignmentDate?, assignedBy?) {
    if (!driverData) return [];

    const driverIds = Array.isArray(driverData)
      ? [...new Set(driverData)]
      : [driverData];

    this.vehicleAssignmentValidator.ensureSingleDriver(driverIds);
    const effectiveDate = assignmentDate || getBusinessDateOnly();
    this.vehicleAssignmentValidator.validateAssignmentDates(effectiveDate);
    const year = this.vehicleAssignmentValidator.ensureRegisteredYear(await this.academicYears.findForDate(effectiveDate));

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
