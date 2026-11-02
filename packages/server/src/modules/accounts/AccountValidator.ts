import { isFileObject } from 'najm-storage';

import { Err, Service, t } from '../../najm';
import { AccountRepository } from './AccountRepository';

@Service()
export class AccountValidator {
  constructor(private accountRepository: AccountRepository) {}

  async ensureExists(id: string) {
    const user = await this.accountRepository.getUser(id);
    if (!user) Err(404, t('users.errors.notFound'));
    return user!;
  }

  /** An uploaded image, or nothing to clear the photo. Anything else is refused. */
  ensureImage(image: unknown): File | Blob | null {
    if (image === null || image === undefined || image === '') return null;
    if (!isFileObject(image) || !image.type.startsWith('image/')) Err(400, t('users.errors.imageInvalid'));
    return image as File | Blob;
  }
}
