import { Err, I18n, Service } from '../../../najm';

@Service()
export class FeeImportValidator {
  @I18n('fees.import') private t!: (key: string) => string;
  refuse(key: string): never { Err(409, this.t(key)); }
}
