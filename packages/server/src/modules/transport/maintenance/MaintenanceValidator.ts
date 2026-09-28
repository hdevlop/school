import { Err, I18n, Service } from '../../../najm';
import { MaintenanceRepository } from './MaintenanceRepository';
import { VehicleRepository } from '../vehicles/VehicleRepository';
import { getEnumValues } from '../../../shared/enums';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';

@Service()
export class MaintenanceValidator {
  @Year() private readonly year!: ResolvedAcademicYear;
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)
      || Number.isNaN(Date.parse(scheduledDate))
      || new Date(scheduledDate).toISOString().slice(0, 10) !== scheduledDate) {
      Err(400, 'Invalid date');
    }
    if (scheduledDate < this.year.reportingStartsOn || scheduledDate > this.year.reportingEndsOn) {
      Err(409, 'Maintenance date is outside the selected school year');
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
    const existingMaintenances = await this.maintenanceRepository.getByVehicleIdAcrossYears(vehicleId);
    
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
