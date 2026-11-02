import { Controller, Get, ResMsg } from '../../najm';
import { CanSchoolWide } from '../../auth';

import { AccountLinkService } from './AccountLinkService';

/**
 * Which logins belong to a student, a parent or a staff member, for the Users
 * screen. It reads every person's login past ownership, so it is school-wide.
 */
@Controller('/account-links')
export class AccountLinkController {
  constructor(private accountLinkService: AccountLinkService) {}

  @Get('/')
  @CanSchoolWide('read:users')
  @ResMsg('users.success.allRetrieved')
  async getAll() {
    return this.accountLinkService.getAll();
  }
}
