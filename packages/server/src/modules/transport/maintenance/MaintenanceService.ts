import { Err, Service } from '@server/najm';
import { MaintenanceRepository } from './MaintenanceRepository';
import { MaintenanceValidator } from './MaintenanceValidator';
import type { CreateMaintenanceDto, UpdateMaintenanceDto } from './MaintenanceDto';

@Service()
export class MaintenanceService {
  constructor(
    private maintenanceRepository: MaintenanceRepository,
    private maintenanceValidator: MaintenanceValidator,
  ) { }

  async getAll() {
    return await this.maintenanceRepository.getAll();
  }

  async getById(id: string) {
    return await this.maintenanceValidator.checkMaintenanceExists(id);
  }

  async getByVehicleId(vehicleId: string) {
    await this.maintenanceValidator.checkVehicleExists(vehicleId);
    return await this.maintenanceRepository.getByVehicleId(vehicleId);
  }

  async getByStatus(status: string) {
    this.maintenanceValidator.validateMaintenanceStatus(status);
    return await this.maintenanceRepository.getByStatus(status);
  }

  async getByType(type: string) {
    this.maintenanceValidator.validateMaintenanceType(type);
    return await this.maintenanceRepository.getByType(type);
  }

  async getByPriority(priority: string) {
    this.maintenanceValidator.validateMaintenancePriority(priority);
    return await this.maintenanceRepository.getByPriority(priority);
  }

  async getByAssignedTo(assignedTo: string) {
    if (!assignedTo || typeof assignedTo !== 'string') {
      Err(400, 'Invalid assignedTo parameter');
    }
    return await this.maintenanceRepository.getByAssignedTo(assignedTo);
  }

  async getScheduledMaintenances() {
    return await this.maintenanceRepository.getScheduledMaintenances();
  }

  async getOverdueMaintenances() {
    return await this.maintenanceRepository.getOverdueMaintenances();
  }

  async getUpcomingMaintenances(withinHours: number = 50) {
    return await this.maintenanceRepository.getUpcomingMaintenances(withinHours);
  }

  async getCount() {
    return await this.maintenanceRepository.getCount();
  }

  async getStatusCounts() {
    return await this.maintenanceRepository.getStatusCounts();
  }

  async getPriorityCounts() {
    return await this.maintenanceRepository.getPriorityCounts();
  }

  async getTypeCounts() {
    return await this.maintenanceRepository.getTypeCounts();
  }

  async getMaintenanceCostAnalytics() {
    return await this.maintenanceRepository.getMaintenanceCostAnalytics();
  }

  async getMaintenanceAnalytics() {
    const [statusCounts, priorityCounts, typeCounts, costAnalytics, totalCount] = await Promise.all([
      this.getStatusCounts(),
      this.getPriorityCounts(), 
      this.getTypeCounts(),
      this.getMaintenanceCostAnalytics(),
      this.getCount()
    ]);

    return {
      total: totalCount.count,
      statusDistribution: statusCounts,
      priorityDistribution: priorityCounts,
      typeDistribution: typeCounts,
      costAnalytics
    };
  }

  async create(data: CreateMaintenanceDto) {
    const {
      vehicleId,
      type,
      title,
      dueHours,
      cost,
      scheduledDate,
      priority,
      partsUsed,
      assignedTo,
      notes
    } = data;

    // Validate vehicle exists
    await this.maintenanceValidator.checkVehicleExists(vehicleId);

    // Validate maintenance data
    await this.maintenanceValidator.validateCreateMaintenance(data);
    this.maintenanceValidator.validateMaintenanceType(type);
    
    if (dueHours) {
      this.maintenanceValidator.validateDueHours(dueHours);
      await this.maintenanceValidator.validateDueHoursAgainstVehicle(vehicleId, dueHours);
    }

    if (cost) {
      this.maintenanceValidator.validateCost(cost);
    }

    if (priority) {
      this.maintenanceValidator.validateMaintenancePriority(priority);
    }

    if (scheduledDate) {
      this.maintenanceValidator.validateScheduledDate(scheduledDate);
    }

    // Check for duplicates
    await this.maintenanceValidator.checkNoDuplicateMaintenance(vehicleId, type, dueHours);

    const maintenanceData = {
      vehicleId,
      type,
      title,
      status: 'scheduled',
      ...(dueHours && { dueHours: String(dueHours) }),
      ...(cost && { cost: String(cost) }),
      ...(scheduledDate && { scheduledDate }),
      ...(priority && { priority }),
      ...(partsUsed && { partsUsed }),
      ...(assignedTo && { assignedTo }),
      ...(notes && { notes })
    };

    const newMaintenance = await this.maintenanceRepository.create(maintenanceData);
    return await this.getById(newMaintenance.id);
  }

  async update(id: string, data: UpdateMaintenanceDto) {
    const maintenance = await this.maintenanceValidator.checkMaintenanceCanBeModified(id);
    const updateData: Record<string, unknown> = {};

    if (data.type !== undefined) {
      this.maintenanceValidator.validateMaintenanceType(data.type);
      updateData.type = data.type;
    }

    if (data.title !== undefined) updateData.title = data.title;

    if (data.status !== undefined) {
      this.maintenanceValidator.validateMaintenanceStatus(data.status);
      updateData.status = data.status;

      if (data.status === 'completed') {
        updateData.completedAt = new Date().toISOString();
      }
    }

    if (data.dueHours !== undefined) {
      this.maintenanceValidator.validateDueHours(data.dueHours);
      await this.maintenanceValidator.validateDueHoursAgainstVehicle(maintenance.vehicleId, data.dueHours);
      updateData.dueHours = String(data.dueHours);
    }

    if (data.cost !== undefined) {
      this.maintenanceValidator.validateCost(data.cost);
      updateData.cost = String(data.cost);
    }

    if (data.scheduledDate !== undefined) {
      if (data.scheduledDate) {
        this.maintenanceValidator.validateScheduledDate(data.scheduledDate);
      }
      updateData.scheduledDate = data.scheduledDate;
    }

    if (data.priority !== undefined) {
      if (data.priority) {
        this.maintenanceValidator.validateMaintenancePriority(data.priority);
      }
      updateData.priority = data.priority;
    }

    if (data.partsUsed !== undefined) updateData.partsUsed = data.partsUsed;

    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;

    if (data.notes !== undefined) updateData.notes = data.notes;

    if (updateData.type || updateData.dueHours) {
      const duplicateType = String(updateData.type ?? maintenance.type);
      const duplicateDueHours = String(updateData.dueHours ?? maintenance.dueHours);
      await this.maintenanceValidator.checkNoDuplicateMaintenance(
        maintenance.vehicleId,
        duplicateType,
        duplicateDueHours,
        id
      );
    }

    if (Object.keys(updateData).length > 0) {
      await this.maintenanceRepository.update(id, updateData);
    }

    return await this.getById(id);
  }

  async updateStatus(id: string, status: string) {
     await this.maintenanceValidator.checkMaintenanceExists(id);
    this.maintenanceValidator.validateMaintenanceStatus(status);

    const updateData: Record<string, unknown> = { status };
    
    if (status === 'completed') {
      updateData.completedAt = new Date().toISOString();
    }

    return await this.maintenanceRepository.update(id, updateData);
  }

  async markAsCompleted(id: string) {
    await this.maintenanceValidator.checkMaintenanceCanBeCompleted(id);
    return await this.maintenanceRepository.markAsCompleted(id);
  }

  async delete(id: string) {
    await this.maintenanceValidator.checkMaintenanceCanBeDeleted(id);
    return await this.maintenanceRepository.delete(id);
  }

  async deleteAll() {
    return await this.maintenanceRepository.deleteAll();
  }

  async markOverdueMaintenances() {
    return await this.maintenanceRepository.markAsOverdue();
  }

  async checkMaintenanceAlerts() {
    const overdue = await this.getOverdueMaintenances();
    const upcoming = await this.getUpcomingMaintenances();

    return {
      overdue: overdue.length,
      upcoming: upcoming.length,
      overdueList: overdue,
      upcomingList: upcoming
    };
  }

  async checkOverdueMaintenanceAlert(vehicleId: string, currentHours: string | number) {
    const maintenanceRecords = await this.getByVehicleId(vehicleId);
    const numericHours = parseFloat(currentHours.toString());
    let mostOverdue = null;

    for (const maintenanceRecord of maintenanceRecords) {
      if (maintenanceRecord.status !== 'scheduled' || !maintenanceRecord.dueHours) {
        continue;
      }

      const dueHours = parseFloat(maintenanceRecord.dueHours.toString());
      
      if (numericHours >= dueHours) {
        const hoursOverdue = numericHours - dueHours;
        
        if (!mostOverdue || hoursOverdue > mostOverdue.hoursOverdue) {
          mostOverdue = {
            maintenance: maintenanceRecord,
            hoursOverdue,
            dueHours
          };
        }

        await this.updateStatus(maintenanceRecord.id, 'overdue');
      }
    }

    if (mostOverdue) {
      const priority = mostOverdue.hoursOverdue > 100 ? 'critical' :
                      mostOverdue.hoursOverdue > 50 ? 'high' : 'medium';

      return {
        type: 'maintenance',
        title: `Maintenance Overdue: ${mostOverdue.maintenance.title}`,
        message: `Vehicle maintenance is overdue by ${mostOverdue.hoursOverdue.toFixed(1)} hours. Current: ${numericHours}h, Due: ${mostOverdue.dueHours}h`,
        priority,
        vehicleId
      };
    }

    return null;
  }

  async checkDueSoonMaintenanceAlert(vehicleId: string, currentHours: string | number) {
    const maintenanceRecords = await this.getByVehicleId(vehicleId);
    const numericHours = parseFloat(currentHours.toString());
    let mostUrgent = null;

    for (const maintenanceRecord of maintenanceRecords) {
      if (maintenanceRecord.status !== 'scheduled' || !maintenanceRecord.dueHours) {
        continue;
      }

      const dueHours = parseFloat(maintenanceRecord.dueHours.toString());
      
      // Check if maintenance is due soon (within 20 hours)
      if ((dueHours - numericHours) <= 20 && (dueHours - numericHours) > 0) {
        const hoursUntilDue = dueHours - numericHours;
        
        if (!mostUrgent || hoursUntilDue < mostUrgent.hoursUntilDue) {
          mostUrgent = {
            maintenance: maintenanceRecord,
            hoursUntilDue,
            dueHours
          };
        }
      }
    }

    if (mostUrgent) {
      return {
        type: 'maintenance',
        title: `Maintenance Due Soon: ${mostUrgent.maintenance.title}`,
        message: `Vehicle maintenance due in ${mostUrgent.hoursUntilDue.toFixed(1)} hours. Current: ${numericHours}h, Due: ${mostUrgent.dueHours}h`,
        priority: 'medium',
        vehicleId
      };
    }

    return null;
  }

  async checkVehicleMaintenanceAlerts(vehicleId: string, currentHours: string | number) {
    const overdueAlert = await this.checkOverdueMaintenanceAlert(vehicleId, currentHours);
    if (overdueAlert) {
      return overdueAlert;
    }

    const dueSoonAlert = await this.checkDueSoonMaintenanceAlert(vehicleId, currentHours);
    return dueSoonAlert;
  }

  async seedDemoMaintenances(maintenanceData: CreateMaintenanceDto[]) {
    const createdMaintenances = [];
    for (const maintenanceRecord of maintenanceData) {
      try {
        const createdMaintenance = await this.create(maintenanceRecord);
        createdMaintenances.push(createdMaintenance);
      } catch (error) {
        continue;
      }
    }

    return createdMaintenances;
  }
}
