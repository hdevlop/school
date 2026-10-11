import { I18n, type TFn } from 'najm-i18n';
import { Err, Service } from '../../najm';
import { LandingRepository } from './LandingRepository';
@Service()
export class LandingValidator {
  @I18n('publicPage') private t!: TFn;
  constructor(private repository: LandingRepository) {}
  async ensureCyclesExist(ids: string[]) {
    if ((await this.repository.cycleIds(ids)).length !== ids.length) Err(this.t('errors.cycle'), 422);
  }
}
