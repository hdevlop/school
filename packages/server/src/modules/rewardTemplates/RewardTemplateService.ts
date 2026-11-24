import { Service } from '../../najm';
import { pickProps } from '../../shared';
import { createRewardTemplateDto, type CreateRewardTemplateDto, type UpdateRewardTemplateDto } from './RewardTemplateDto';
import { RewardTemplateRepository } from './RewardTemplateRepository';
import { RewardTemplateValidator } from './RewardTemplateValidator';

const MUTABLE_FIELDS = ['title', 'category', 'rewardType', 'points', 'description', 'active'] as const;

@Service()
export class RewardTemplateService {
  constructor(
    private rewardTemplateRepository: RewardTemplateRepository,
    private rewardTemplateValidator: RewardTemplateValidator,
  ) {}

  async list() {
    return this.rewardTemplateRepository.getAll();
  }

  async getById(id: string) {
    return this.rewardTemplateValidator.ensureExists(id);
  }

  async create(data: CreateRewardTemplateDto, actor: { id: string }) {
    await this.rewardTemplateValidator.ensureTitleUnique(data.title, data.category, data.rewardType);
    return this.rewardTemplateRepository.create({
      title: data.title,
      category: data.category,
      rewardType: data.rewardType,
      points: data.points,
      description: data.description ?? '',
      active: data.active ?? true,
      createdBy: actor.id,
    });
  }

  async update(id: string, data: UpdateRewardTemplateDto) {
    const existing = await this.rewardTemplateValidator.ensureExists(id);
    if (data.title !== undefined || data.category !== undefined || data.rewardType !== undefined) {
      await this.rewardTemplateValidator.ensureTitleUnique(
        data.title ?? existing.title,
        data.category ?? existing.category,
        data.rewardType ?? existing.rewardType,
        id,
      );
    }
    return this.rewardTemplateRepository.update(id, pickProps(data, MUTABLE_FIELDS));
  }

  /**
   * The starter bank, added once. Additive: a template whose name already
   * exists for its category and reward type is left as the school edited it,
   * and one the school deleted comes back only if the command runs again.
   */
  async seedDefaults(templates: readonly CreateRewardTemplateDto[]) {
    const rows = templates.map((template) => createRewardTemplateDto.parse(template));
    return this.rewardTemplateRepository.insertMissing(rows.map((row) => ({
      ...row,
      description: row.description ?? '',
      active: row.active ?? true,
      createdBy: null,
    })));
  }

  // A recorded reward copies the template's values, so nothing points back to it.
  async delete(id: string) {
    await this.rewardTemplateValidator.ensureExists(id);
    return this.rewardTemplateRepository.delete(id);
  }
}
