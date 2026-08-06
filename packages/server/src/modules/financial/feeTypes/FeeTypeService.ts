import { Service } from '@server/najm';
import { pickProps, isEmpty } from '@server/shared';
import { FeeTypeValidator } from './FeeTypeValidator';
import { FeeTypeRepository } from './FeeTypeRepository';
import type { CreateFeeTypeDto, UpdateFeeTypeDto } from './FeeTypeDto';

type SeedFeeTypeDto = CreateFeeTypeDto & { id: string };

@Service()
export class FeeTypeService {

  constructor(
    private feeTypeRepository: FeeTypeRepository,
    private feeTypeValidator: FeeTypeValidator,
  ) { }

  // ========== RETRIEVAL METHODS ==========

  async getAll() {
    return await this.feeTypeRepository.getAll();
  }

  async getCount() {
    return await this.feeTypeRepository.getCount();
  }

  async getById(id: string) {
    await this.feeTypeValidator.checkExists(id);
    return await this.feeTypeRepository.getById(id);
  }

  async getByName(name: string) {
    await this.feeTypeValidator.checkNameExists(name);
    return await this.feeTypeRepository.getByName(name);
  }

  async getByStatus(status: string) {
    await this.feeTypeValidator.validateFeeTypeStatus(status);
    return await this.feeTypeRepository.getByStatus(status);
  }

  async getByCategory(category: string) {
    return await this.feeTypeRepository.getByCategory(category);
  }

  async create(data: CreateFeeTypeDto) {
    await this.feeTypeValidator.validate(data);
    const feeTypeDetails = {
      name: data.name,
      description: data.description,
      category: data.category,
      amount: data.amount,
      paymentType: data.paymentType,
      status: data.status,
    };

    return await this.feeTypeRepository.create(feeTypeDetails);
  }

  async update(id: string, data: UpdateFeeTypeDto) {

    const FEETYPE_UPDATE_KEYS = [
      'name', 'description', 'category', 'amount', 'paymentType', 'status'
    ];

    await this.feeTypeValidator.validate(data, id);

    const feeTypeData = pickProps(data, FEETYPE_UPDATE_KEYS);

    if (isEmpty(feeTypeData)) {
      return await this.getById(id);
    }

    return await this.feeTypeRepository.update(id, feeTypeData);
  }

  // ========== STATUS-UPDATE-METHOD ==========

  async updateStatus(id: string, status: string) {
    await this.feeTypeValidator.checkExists(id);
    await this.feeTypeValidator.validateFeeTypeStatus(status);
    return await this.feeTypeRepository.update(id, { status });
  }

  // ========== DELETE-METHODS ==========

  async delete(id: string) {
    await this.feeTypeValidator.checkExists(id);
    return await this.feeTypeRepository.delete(id);
  }

  async deleteAll() {
    return await this.feeTypeRepository.deleteAll();
  }

  // ========== SEED METHOD ==========

  async seedDemoFeeTypes(feeTypesData: SeedFeeTypeDto[]) {
    const createdFeeTypes = [];
    for (const feeTypeData of feeTypesData) {
      const alreadyExists = await this.feeTypeValidator.isExists(feeTypeData.id);
      if (alreadyExists) continue;
      await this.feeTypeValidator.validate(feeTypeData);
      const feeType = await this.feeTypeRepository.create({ ...feeTypeData });
      createdFeeTypes.push(feeType);
    }
    return createdFeeTypes;
  }

}
