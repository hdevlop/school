import { Service, Transaction } from '@server/najm';
import { VehicleRepository } from './VehicleRepository';
import { VehicleValidator } from './VehicleValidator';
import { VehicleAssignmentService } from '../vehicleAssignments/VehicleAssignmentService';
import type { CreateVehicleDto, CreateVehiclesBulkDto, UpdateVehicleDto } from './VehicleDto';

@Service()
export class VehicleService {
  constructor(
    private vehicleRepository: VehicleRepository,
    private vehicleValidator: VehicleValidator,
    private vehicleAssignmentService: VehicleAssignmentService,
  ) { }

  async getAll() {
    return await this.vehicleRepository.getAll();
  }

  async getById(id: string) {
    await this.vehicleValidator.checkVehicleExists(id);
    return await this.vehicleRepository.getById(id);
  }

  async getCount() {
    return await this.vehicleRepository.getCount();
  }

  @Transaction()
  async create(data: CreateVehicleDto) {

    await this.vehicleValidator.validate(data);

    const vehicleDetails = {
      ...(data.id && { id: data.id }),
      type: data.type,
      name: data.name,
      brand: data.brand,
      model: data.model,
      year: data.year,
      capacity: data.capacity,
      licensePlate: data.licensePlate,
      purchaseDate: data.purchaseDate,
      purchasePrice: data.purchasePrice,
      status: data.status || 'active',
      fuelType: data.fuelType || 'diesel',
      initialMileage: data.initialMileage || '0',
      currentMileage: data.currentMileage,
      notes: data.notes
    }

    const vehicle = await this.vehicleRepository.create(vehicleDetails);

    if ( data.driverId || data.drivers) {
      const driverData = data.driverId || data.drivers;
      await this.vehicleAssignmentService.processDriver(
        vehicle.id,
        driverData,
        data.assignmentDate,
        data.assignedBy
      );
    }

    return vehicle;
  }

  async update(id: string, data: UpdateVehicleDto) {
    await this.vehicleValidator.validate(data, id);
    return await this.vehicleRepository.update(id, data);
  }

  async delete(id: string) {
    await this.vehicleValidator.checkVehicleExists(id);
    return await this.vehicleRepository.delete(id);
  }


  async deleteAll() {
    return await this.vehicleRepository.deleteAll();
  }

  async createBulk(vehicles: CreateVehiclesBulkDto) {
    const createdVehicles = [];
    for (const [index, vh] of vehicles.entries()) {
      try {
        const vehicle = await this.create(vh);
        createdVehicles.push(vehicle);
      } catch (error: any) {
        if (error?.status === 409) continue;
        const identifier = vh.licensePlate || vh.id || vh.name || `at index ${index}`;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create vehicle ${identifier}: ${message}`);
      }
    }
    return createdVehicles;
  }

}
