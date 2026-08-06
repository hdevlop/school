import { Err, I18n, Service } from '@server/najm';
import { VehicleAssignmentRepository } from './VehicleAssignmentRepository';

@Service()
export class VehicleAssignmentValidator {
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

  async validateAssignmentDates(assignmentDate: string, unassignmentDate?: string | null) {
    if (unassignmentDate) {
      const assignment = new Date(assignmentDate);
      const unassignment = new Date(unassignmentDate);

      if (unassignment < assignment) {
        Err(400, this.t('invalidDateRange'));
      }
    }
    return true;
  }

  async validateNewAssignment(vehicleId: string, driverId: string, assignmentDate: string) {
    // Removed restriction: Allow reassigning drivers to vehicles that already have active assignments
    // The system will handle multiple assignments or the frontend can manage unassignment if needed

    // Note: We don't check if driver has active assignments because a driver CAN have multiple vehicles
    // This is the whole point of the many-to-many relationship!

    return true;
  }

  async validateUnassignment(id: string) {
    const assignment = await this.checkAssignmentExists(id);

    if (assignment.status !== 'active') {
      Err(400, this.t('assignmentNotActive'));
    }

    return true;
  }

  async validate(data: Record<string, unknown>, excludeId: string | null = null) {
    const isUpdate = excludeId !== null;

    if (isUpdate) {
      await this.checkAssignmentExists(excludeId);
    }

    const { assignmentDate, unassignmentDate, vehicleId, driverId } = data;

    // Validate date range
    if (assignmentDate && unassignmentDate) {
      await this.validateAssignmentDates(assignmentDate as string, unassignmentDate as string);
    }

    // For new assignments, validate that vehicle doesn't have active assignment
    if (!isUpdate && vehicleId && driverId && assignmentDate) {
      await this.validateNewAssignment(vehicleId as string, driverId as string, assignmentDate as string);
    }

    return data;
  }
}
