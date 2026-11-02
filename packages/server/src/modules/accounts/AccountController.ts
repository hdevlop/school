import { Body, Controller, Get, Params, Put, ResMsg, Validate } from '../../najm';
import { Can, CanSchoolWide } from '../../auth';

import { accountIdParam } from './AccountDto';
import { AccountService } from './AccountService';

/** What the Users screen needs beyond najm-auth's own account routes. */
@Controller('/accounts')
export class AccountController {
  constructor(private accountService: AccountService) {}

  /** Which logins belong to a student, a parent or a staff member. It reads every person's login past ownership. */
  @Get('/links')
  @CanSchoolWide('read:users')
  @ResMsg('users.success.allRetrieved')
  async getLinks() {
    return this.accountService.getLinks();
  }

  // The body is multipart: `image` is the uploaded file, which the validator
  // checks. A schema would see a File where najm-auth's DTO expects a path.
  @Put('/:id/image')
  @Can('update:users')
  @Validate({ params: accountIdParam })
  @ResMsg('users.success.updated')
  async updateImage(@Params('id') id: string, @Body('image') image: unknown) {
    return this.accountService.updateImage(id, image);
  }
}
