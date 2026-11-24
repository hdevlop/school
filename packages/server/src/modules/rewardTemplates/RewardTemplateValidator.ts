import { Err, Service, t } from '../../najm';
import { RewardTemplateRepository } from './RewardTemplateRepository';

@Service()
export class RewardTemplateValidator {
  constructor(private rewardTemplateRepository: RewardTemplateRepository) {}

  async ensureExists(id: string) {
    const template = await this.rewardTemplateRepository.getById(id);
    if (!template) Err(404, t('rewardTemplates.errors.notFound'));
    return template!;
  }

  async ensureTitleUnique(title: string, category: string, rewardType: string, excludeId?: string) {
    if (await this.rewardTemplateRepository.findDuplicate(title, category, rewardType, excludeId)) {
      Err(409, t('rewardTemplates.errors.titleExists'));
    }
  }
}
