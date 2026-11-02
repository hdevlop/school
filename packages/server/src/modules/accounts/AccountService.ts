import { StorageService } from 'najm-storage';

import { Service, Transaction } from '../../najm';
import { AccountRepository } from './AccountRepository';
import { AccountValidator } from './AccountValidator';

@Service()
export class AccountService {
  constructor(
    private accountRepository: AccountRepository,
    private accountValidator: AccountValidator,
    private storage: StorageService,
  ) {}

  async getLinks() {
    return this.accountRepository.getLinks();
  }

  /**
   * najm-auth's account update stores `image` as given, so a file sent there
   * was saved as the text "[object File]". The file is stored here and the
   * account keeps its path; no image clears the photo.
   */
  @Transaction()
  async updateImage(id: string, input: unknown) {
    await this.accountValidator.ensureExists(id);
    const file = this.accountValidator.ensureImage(input);
    const image = file ? await this.storage.processFile('users', file, { filePath: `${id}_avatar.png` }) : null;
    const user = await this.accountRepository.updateImage(id, image);
    return { id: user.id, image: user.image, updatedAt: user.updatedAt };
  }
}
