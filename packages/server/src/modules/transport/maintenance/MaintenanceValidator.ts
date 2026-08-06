import { Err, I18n, Service } from '@server/najm';
import { MaintenanceRepository } from './MaintenanceRepository';
import { VehicleRepository } from '@server/modules/transport/vehicles/VehicleRepository';
import { getEnumValues } from '@server/shared/enums';
import { getBusinessDate } from '@server/shared/businessDate';

@Service()
export class MaintenanceValidator {
  @I18n('maintenance.errors') private mt!: (key: string) => string;
  @I18n('vehicles.errors') private vt!: (key: string) => string;

  constructor(
    private maintenanceRepository: MaintenanceRepository,
    private vehicleRepository: VehicleRepository,
  ) { }

  async validateCreateMaintenance(data) {
    return data;
  }

  async checkMaintenanceExists(id: string) {
    const maintenance = await this.maintenanceRepository.getById(id);
    if (!maintenance) {
      Err(404, this.mt('notFound'));
    }
    return maintenance;
  }

  async checkVehicleExists(vehicleId: string) {
    const vehicle = await this.vehicleRepository.getById(vehicleId);
    if (!vehicle) {
      Err(404, this.vt('notFound'));
    }
    return vehicle;
  }

  validateMaintenanceType(type: string) {
    const validTypes = getEnumValues('maintenanceType');
    if (!validTypes.includes(type)) {
      Err(400, this.mt('invalidType'));
    }
    return true;
  }

  validateMaintenanceStatus(status: string) {
    const validStatuses = getEnumValues('maintenanceStatus');
    if (!validStatuses.includes(status)) {
      Err(400, this.mt('invalidStatus'));
    }
    return true;
  }

  validateMaintenancePriority(priority: string) {
    const validPriorities = ['low', 'normal', 'high', 'critical'];
    if (!validPriorities.includes(priority)) {
      Err(400, this.mt('invalidPriority'));
    }
    return true;
  }

  validateScheduledDate(scheduledDate: string) {
    if (!scheduledDate) return true;

    // Check if it's a valid date string
    const date = new Date(scheduledDate);
    if (isNaN(date.getTime())) {
      Err(400, 'Invalid date');
    }

    // Check if the date is not in the past (allow today)
    const today = getBusinessDate();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const scheduledDateObj = new Date(scheduledDate);
    scheduledDateObj.setHours(0, 0, 0, 0);

    if (scheduledDateObj < today) {
      Err(400, this.mt('scheduledDateInPast'));
    }

    return true;
  }

  validateDueHours(dueHours: string | number) {
    if (!dueHours) return true;

    const numericHours = parseFloat(dueHours.toString());
    if (isNaN(numericHours) || numericHours < 0) {
      Err(400, this.mt('invalidDueHours'));
    }
    return true;
  }

  validateCost(cost: string | number) {
    if (!cost) return true;

    const numericCost = parseFloat(cost.toString());
    if (isNaN(numericCost) || numericCost < 0) {
      Err(400, this.mt('invalidCost'));
    }
    return true;
  }

  async validateDueHoursAgainstVehicle(vehicleId: string, dueHours: string | number) {
    if (!dueHours) return true;

    const vehicle = await this.checkVehicleExists(vehicleId);
    const numericDueHours = parseFloat(dueHours.toString());
    const currentHoursValue = (vehicle as Record<string, unknown>)['currentHours'];
    const currentHours = parseFloat(String(currentHoursValue ?? '0'));

    if (numericDueHours <= currentHours) {
      Err(400, this.mt('dueHoursPastCurrent'));
    }
    return true;
  }

  async checkMaintenanceCanBeModified(id: string) {
    const maintenance = await this.checkMaintenanceExists(id);
    
    if (maintenance.status === 'completed') {
      Err(400, this.mt('cannotModifyCompleted'));
    }
    
    return maintenance;
  }

  async checkMaintenanceCanBeDeleted(id: string) {
    const maintenance = await this.checkMaintenanceExists(id);
    
    if (maintenance.status === 'inProgress') {
      Err(400, this.mt('cannotDeleteInProgress'));
    }
    
    return maintenance;
  }

  async checkMaintenanceCanBeCompleted(id: string) {
    const maintenance = await this.checkMaintenanceExists(id);
    
    if (maintenance.status === 'completed') {
      Err(400, this.mt('alreadyCompleted'));
    }
    
    if (maintenance.status === 'cancelled') {
      Err(400, this.mt('cannotCompleteCancelled'));
    }
    
    return maintenance;
  }

  async checkNoDuplicateMaintenance(vehicleId: string, type: string, dueHours: string | number, excludeId?: string) {
    const existingMaintenances = await this.maintenanceRepository.getByVehicleId(vehicleId);
    
    const duplicate = existingMaintenances.find(m => 
      m.type === type && 
      m.dueHours === dueHours?.toString() && 
      m.status !== 'completed' && 
      m.status !== 'cancelled' &&
      m.id !== excludeId
    );

    if (duplicate) {
      Err(409, this.mt('duplicateMaintenanceExists'));
    }
    
    return true;
  }


}
