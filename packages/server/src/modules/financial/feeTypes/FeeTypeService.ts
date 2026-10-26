import { Service } from '../../../najm';
import { pickProps, isEmpty } from '../../../shared';
import { FeeTypeValidator } from './FeeTypeValidator';
import { FeeTypeRepository } from './FeeTypeRepository';
import type { CreateFeeTypeDto, UpdateFeeTypeDto } from './FeeTypeDto';
import { StorageService } from 'najm-storage';
import { nanoid } from 'nanoid';

type SeedFeeTypeDto = CreateFeeTypeDto & { id: string; aliases?: string[] };

const seedNames = (data: SeedFeeTypeDto) =>
  new Set([data.name, ...(data.aliases ?? []), ...Object.values(data.labels ?? {})]);

@Service()
export class FeeTypeService {

  constructor(
    private feeTypeRepository: FeeTypeRepository,
    private feeTypeValidator: FeeTypeValidator,
    private storage: StorageService,
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

  /** Called by the dashboard's session-protected image route. */
  async serveImage(id: string) {
    const feeType = await this.feeTypeValidator.checkExists(id);
    if (!feeType.image) return new Response(null, { status: 404 });
    return this.storage.serveFile('fee-types', `${id}_icon.png`);
  }

  async create(data: CreateFeeTypeDto) {
    await this.feeTypeValidator.validate(data);
    const id = nanoid(5);
    const image = await this.processImage(id, data.image);
    const feeTypeDetails = {
      id,
      name: data.name,
      labels: data.labels,
      image,
      description: data.description,
      category: data.category,
      amount: data.amount,
      paymentType: data.paymentType,
      status: data.status,
    };

    try {
      return await this.feeTypeRepository.create(feeTypeDetails);
    } catch (error) {
      if (data.image instanceof Blob) await this.removeImage(id);
      return this.feeTypeValidator.refuseDuplicateName(error);
    }
  }

  async update(id: string, data: UpdateFeeTypeDto) {

    const FEETYPE_UPDATE_KEYS = [
      'name', 'labels', 'description', 'category', 'amount', 'paymentType', 'status'
    ];

    await this.feeTypeValidator.validate(data, id);

    const feeTypeData = pickProps(data, FEETYPE_UPDATE_KEYS);
    if (data.image !== undefined) {
      feeTypeData.image = await this.processImage(id, data.image);
    }

    if (isEmpty(feeTypeData)) {
      return await this.getById(id);
    }

    const updated = await this.feeTypeRepository.update(id, feeTypeData)
      .catch((error) => this.feeTypeValidator.refuseDuplicateName(error));
    if (data.image === null) await this.removeImage(id);
    return updated;
  }

  private async processImage(id: string, input: CreateFeeTypeDto['image']) {
    const image = await this.storage.processFile('fee-types', input, { filePath: `${id}_icon.png` });
    // Replacing the file at the same path must refresh browser image caches.
    return image && input instanceof Blob
      ? `/api/fee-type-images/${encodeURIComponent(id)}?v=${nanoid(8)}`
      : image;
  }

  private async removeImage(id: string) {
    await this.storage.delete('fee-types', `${id}_icon.png`).catch(() => {});
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
    await this.feeTypeValidator.ensureNotInUse(id);
    const deleted = await this.feeTypeRepository.delete(id);
    await this.removeImage(id);
    return deleted;
  }

  async deleteAll() {
    const result = await this.feeTypeRepository.deleteAll();
    await Promise.all(result.deletedFeeTypes.map(type => this.removeImage(type.id)));
    return result;
  }

  // ========== SEED METHOD ==========

  async seedDemoFeeTypes(feeTypesData: SeedFeeTypeDto[]) {
    const createdFeeTypes = [];
    for (const definition of feeTypesData) {
      const { aliases: _aliases, ...feeTypeData } = definition;
      // Match legacy names and translations as well as the stable seed id.
      // Existing records keep their ids, prices and school-specific settings.
      let alreadyExists = await this.feeTypeValidator.isExists(feeTypeData.id);
      for (const name of seedNames(definition)) {
        if (alreadyExists) break;
        alreadyExists = await this.feeTypeValidator.isNameExists(name);
      }
      if (alreadyExists) continue;
      await this.feeTypeValidator.validate(feeTypeData);
      const feeType = await this.feeTypeRepository.create({ ...feeTypeData });
      createdFeeTypes.push(feeType);
    }
    return createdFeeTypes;
  }

  /** Demo charges must reference the school's existing ids when a default is reused. */
  async resolveSeedFeeTypeIds(definitions: SeedFeeTypeDto[]): Promise<Map<string, string>> {
    const existing = await this.feeTypeRepository.getAll();
    const normalize = (name: string) => name.trim().toLowerCase();
    return new Map(definitions.map(definition => {
      const names = new Set([...seedNames(definition)].map(normalize));
      const match = existing.find(type => type.id === definition.id)
        ?? existing.find(type => names.has(normalize(type.name)));
      if (!match) throw new Error(`Seed fee type ${definition.name} was not created`);
      return [definition.id, match.id];
    }));
  }

}
