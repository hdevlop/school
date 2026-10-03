import { Service, Transaction } from '../../../najm';
import { StudentRouteRepository } from './StudentRouteRepository';
import { StudentRouteValidator } from './StudentRouteValidator';
import { FeeService } from '../../financial/fees/FeeService';
import { FeeTypeRepository } from '../../financial/feeTypes/FeeTypeRepository';
import type { CreateStudentRouteDto, ReassignStudentRouteDto, UpdateStudentRouteDto } from './StudentRouteDto';
import { getBusinessDateOnly } from '../../../shared/businessDate';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';

@Service()
export class StudentRouteService {
  @Year() private readonly year!: ResolvedAcademicYear;
  constructor(
    private studentRouteRepository: StudentRouteRepository,
    private studentRouteValidator: StudentRouteValidator,
    private feeService: FeeService,
    private feeTypeRepository: FeeTypeRepository,
  ) {}

  async getAll() {
    return await this.studentRouteRepository.getAll();
  }

  async getById(id: string) {
    await this.studentRouteValidator.checkExists(id);
    return await this.studentRouteRepository.getById(id);
  }

  async getByVehicleId(vehicleId: string) {
    return await this.studentRouteRepository.getByVehicleId(vehicleId);
  }

  async getByStudentId(studentId: string) {
    return await this.studentRouteRepository.getByStudentId(studentId);
  }

  @Transaction()
  async assign(data: CreateStudentRouteDto) {
    await this.studentRouteRepository.lockStudent(data.studentId);
    await this.studentRouteValidator.validate(data);
    const assignmentDate = data.assignmentDate || getBusinessDateOnly();
    const status = data.status || 'active';
    await this.studentRouteValidator.validateInterval(assignmentDate, data.unassignmentDate);
    this.studentRouteValidator.ensureStatusDates(status, data.unassignmentDate);
    await this.studentRouteValidator.validateStudentPlacement(data.studentId, assignmentDate);
    if (status !== 'cancelled') {
      await this.studentRouteValidator.checkNoOverlappingRoute(
        data.studentId, assignmentDate, data.unassignmentDate,
      );
    }
    await this.studentRouteValidator.validateAssignment(data.studentId, data.vehicleId, {
      activeToday: status === 'active' && assignmentDate <= getBusinessDateOnly(),
    });

    const assignment = await this.studentRouteRepository.create({
      studentId: data.studentId,
      vehicleId: data.vehicleId,
      assignmentDate,
      unassignmentDate: data.unassignmentDate || null,
      status,
      pickupLocation: data.pickupLocation || null,
      pickupPlaceId: data.pickupPlaceId || null,
      pickupLatitude: data.pickupLatitude ?? null,
      pickupLongitude: data.pickupLongitude ?? null,
      dropoffLocation: data.dropoffLocation || null,
      dropoffPlaceId: data.dropoffPlaceId || null,
      dropoffLatitude: data.dropoffLatitude ?? null,
      dropoffLongitude: data.dropoffLongitude ?? null,
      notes: data.notes || null,
      assignedBy: data.assignedBy || null,
    });

    // Auto-create transport fee for the student
    if (status !== 'cancelled') {
      await this.createTransportFee(data.studentId, data.assignedBy, assignment.assignmentDate);
      if (data.unassignmentDate) await this.endTransportFee(assignment.studentId, data.unassignmentDate, data.assignedBy);
    }

    return await this.studentRouteRepository.getById(assignment.id);
  }

  async update(id: string, data: UpdateStudentRouteDto) {
    await this.studentRouteValidator.validate(data, id);
    return await this.studentRouteRepository.update(id, data);
  }

  @Transaction()
  async reassign(id: string, data: ReassignStudentRouteDto, assignedBy?: string | null) {
    const existing = await this.getLockedRoute(id);
    this.studentRouteValidator.ensureReassignable(existing.status);
    await this.studentRouteValidator.validate(data, id);
    const assignmentDate = data.assignmentDate || getBusinessDateOnly();
    await this.studentRouteValidator.validateInterval(assignmentDate);
    this.studentRouteValidator.ensureReassignmentDate(assignmentDate, existing.assignmentDate);
    await this.studentRouteValidator.validateStudentPlacement(existing.studentId, assignmentDate);
    await this.studentRouteValidator.checkNoOverlappingRoute(
      existing.studentId, assignmentDate, null, id,
    );
    await this.studentRouteValidator.validateAssignment(existing.studentId, data.vehicleId, {
      activeToday: true, excludeId: id,
    });

    await this.studentRouteRepository.update(id, {
      unassignmentDate: assignmentDate,
      status: 'completed',
    });

    const replacement = await this.studentRouteRepository.create({
      studentId: existing.studentId,
      vehicleId: data.vehicleId,
      assignmentDate,
      status: 'active',
      pickupLocation: data.pickupLocation === undefined ? existing.pickupLocation : data.pickupLocation,
      pickupPlaceId: data.pickupPlaceId === undefined ? existing.pickupPlaceId : data.pickupPlaceId,
      pickupLatitude: data.pickupLatitude === undefined ? existing.pickupLatitude : data.pickupLatitude,
      pickupLongitude: data.pickupLongitude === undefined ? existing.pickupLongitude : data.pickupLongitude,
      dropoffLocation: data.dropoffLocation === undefined ? existing.dropoffLocation : data.dropoffLocation,
      dropoffPlaceId: data.dropoffPlaceId === undefined ? existing.dropoffPlaceId : data.dropoffPlaceId,
      dropoffLatitude: data.dropoffLatitude === undefined ? existing.dropoffLatitude : data.dropoffLatitude,
      dropoffLongitude: data.dropoffLongitude === undefined ? existing.dropoffLongitude : data.dropoffLongitude,
      notes: data.notes === undefined ? existing.notes : data.notes,
      assignedBy: assignedBy || existing.assignedBy || null,
    });
    await this.createTransportFee(existing.studentId, assignedBy, assignmentDate);
    return await this.studentRouteRepository.getById(replacement.id);
  }

  @Transaction()
  async unassign(id: string, requestedDate?: string | null, actorId?: string) {
    const assignment = await this.getLockedRoute(id);
    this.studentRouteValidator.ensureActiveRoute(assignment.status);
    const effectiveDate = requestedDate || getBusinessDateOnly();
    this.studentRouteValidator.ensureUnassignmentDate(effectiveDate, assignment.assignmentDate);
    const updated = await this.studentRouteRepository.update(id, {
      status: 'completed',
      unassignmentDate: effectiveDate,
    });

    await this.endTransportFee(assignment.studentId, effectiveDate, actorId); // FIX: SEC-012 — current operator.

    return updated;
  }

  async delete(id: string) {
    await this.studentRouteValidator.checkExists(id);
    return await this.studentRouteRepository.delete(id);
  }

  async deleteAll() {
    return await this.studentRouteRepository.deleteAll();
  }

  async clearForSeedReset() {
    return this.studentRouteRepository.clearForSeedReset();
  }

  private async getLockedRoute(id: string) {
    const route = await this.studentRouteValidator.checkExists(id);
    await this.studentRouteRepository.lockStudent(route.studentId);
    // A competing end or replacement may have finished while the lock waited.
    return await this.studentRouteValidator.checkExists(id);
  }

  private async endTransportFee(studentId: string, effectiveDate: string, assignedBy?: string | null) {
    const allFeeTypes = await this.feeTypeRepository.getAll();
    const transportFeeType = allFeeTypes.find(ft => ft.category === 'transport' && ft.status === 'active');
    if (transportFeeType) {
      await this.feeService.endTransportFee(studentId, transportFeeType.id, effectiveDate, assignedBy || undefined);
    }
  }

  // Find the active transport fee type and create a fee for the student.
  // Assignment billing is idempotent for one student/type/academic year.
  private async createTransportFee(studentId: string, assignedBy?: string | null, effectiveDate?: string | null) {
    const allFeeTypes = await this.feeTypeRepository.getAll();
    const transportFeeType = allFeeTypes.find(ft => ft.category === 'transport' && ft.status === 'active');

    this.studentRouteValidator.ensureTransportFeeType(transportFeeType);

    try {
      await this.feeService.create({
        studentId,
        feeTypeId: transportFeeType.id,
        schedule: 'monthly',
        baseAmount: Number(transportFeeType.amount),
        academicYear: this.year.label,
        effectiveDate: effectiveDate || undefined,
      }, assignedBy || undefined);
    } catch (err: any) {
      // Rejoining in the same academic year resumes only the future cancelled
      // installments; a normal reassignment remains an idempotent no-op.
      if (err?.status !== 409 && err?.statusCode !== 409) throw err;
      const resumed = await this.feeService.resumeTransportFee(
        studentId,
        transportFeeType.id,
        effectiveDate || getBusinessDateOnly(),
        assignedBy || undefined,
      );
      if (!resumed.fee) throw err;
    }
  }
}
