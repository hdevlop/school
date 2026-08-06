import { Err, Service, Transaction } from '@server/najm';
import { StudentRouteRepository } from './StudentRouteRepository';
import { StudentRouteValidator } from './StudentRouteValidator';
import { FeeService } from '../../financial/fees/FeeService';
import { FeeTypeRepository } from '../../financial/feeTypes/FeeTypeRepository';
import type { CreateStudentRouteDto, ReassignStudentRouteDto, UpdateStudentRouteDto } from './StudentRouteDto';
import { getBusinessDateOnly } from '@server/shared/businessDate';

@Service()
export class StudentRouteService {
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
    return await this.studentRouteRepository.getActiveByVehicleId(vehicleId);
  }

  async getByStudentId(studentId: string) {
    return await this.studentRouteRepository.getByStudentId(studentId);
  }

  @Transaction()
  async assign(data: CreateStudentRouteDto) {
    await this.studentRouteValidator.validate(data);
    await this.studentRouteValidator.validateAssignment(data.studentId, data.vehicleId);

    const assignment = await this.studentRouteRepository.create({
      studentId: data.studentId,
      vehicleId: data.vehicleId,
      assignmentDate: data.assignmentDate || getBusinessDateOnly(),
      status: 'active',
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
    await this.createTransportFee(data.studentId, data.assignedBy, assignment.assignmentDate);

    return await this.studentRouteRepository.getById(assignment.id);
  }

  async update(id: string, data: UpdateStudentRouteDto) {
    await this.studentRouteValidator.validate(data, id);
    return await this.studentRouteRepository.update(id, data);
  }

  @Transaction()
  async reassign(id: string, data: ReassignStudentRouteDto, assignedBy?: string | null) {
    const existing = await this.studentRouteValidator.checkExists(id);
    await this.studentRouteValidator.validate(data, id);
    await this.studentRouteValidator.validateAssignment(existing.studentId, data.vehicleId, id);

    await this.studentRouteRepository.update(id, {
      ...data,
      assignmentDate: data.assignmentDate || getBusinessDateOnly(),
      unassignmentDate: null,
      status: 'active',
      assignedBy: assignedBy || existing.assignedBy || null,
    });

    await this.createTransportFee(existing.studentId, assignedBy, data.assignmentDate);
    return await this.studentRouteRepository.getById(id);
  }

  @Transaction()
  async unassign(id: string) {
    const assignment = await this.studentRouteValidator.checkExists(id);
    const effectiveDate = getBusinessDateOnly();
    const updated = await this.studentRouteRepository.update(id, {
      status: 'completed',
      unassignmentDate: effectiveDate,
    });

    const allFeeTypes = await this.feeTypeRepository.getAll();
    const transportFeeType = allFeeTypes.find(ft => ft.category === 'transport' && ft.status === 'active');
    if (transportFeeType) {
      await this.feeService.endTransportFee(
        assignment.studentId,
        transportFeeType.id,
        effectiveDate,
        assignment.assignedBy || undefined,
      );
    }

    return updated;
  }

  async delete(id: string) {
    await this.studentRouteValidator.checkExists(id);
    return await this.studentRouteRepository.delete(id);
  }

  async deleteAll() {
    return await this.studentRouteRepository.deleteAll();
  }

  // Find the active transport fee type and create a fee for the student.
  // Assignment billing is idempotent for one student/type/academic year.
  private async createTransportFee(studentId: string, assignedBy?: string | null, effectiveDate?: string | null) {
    const allFeeTypes = await this.feeTypeRepository.getAll();
    const transportFeeType = allFeeTypes.find(ft => ft.category === 'transport' && ft.status === 'active');

    if (!transportFeeType) {
      Err(409, 'No active transport fee type is configured');
    }

    try {
      await this.feeService.create({
        studentId,
        feeTypeId: transportFeeType.id,
        schedule: 'monthly',
        baseAmount: Number(transportFeeType.amount),
        effectiveDate: effectiveDate || undefined,
        assignedBy: assignedBy || undefined,
      }, assignedBy || undefined);
    } catch (err: any) {
      // Rejoining in the same academic year resumes only the future cancelled
      // installments; a normal reassignment remains an idempotent no-op.
      if (err?.status !== 409 && err?.statusCode !== 409) throw err;
      await this.feeService.resumeTransportFee(
        studentId,
        transportFeeType.id,
        effectiveDate || getBusinessDateOnly(),
        assignedBy || undefined,
      );
    }
  }
}
