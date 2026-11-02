import { Service } from '../../najm';
import { AccountLinkRepository } from './AccountLinkRepository';

@Service()
export class AccountLinkService {
  constructor(private accountLinkRepository: AccountLinkRepository) {}

  async getAll() {
    return this.accountLinkRepository.getAll();
  }
}
