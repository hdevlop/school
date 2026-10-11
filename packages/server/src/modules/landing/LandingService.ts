import { DEFAULT_LANDING_CONTENT, type LandingContent } from '@sms/contracts';
import { Service } from '../../najm';
import { LandingRepository } from './LandingRepository';
import { LandingValidator } from './LandingValidator';

@Service()
export class LandingService {
  constructor(private repository: LandingRepository, private validator: LandingValidator) {}
  async get() { return await this.repository.get() ?? structuredClone(DEFAULT_LANDING_CONTENT); }
  async save(content: LandingContent) {
    const ids = [...new Set([...Object.keys(content.programBlurbs), ...Object.keys(content.programPhotoSlots)])];
    await this.validator.ensureCyclesExist(ids);
    return this.repository.save(content);
  }
}
