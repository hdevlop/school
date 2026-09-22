import { Body, Controller, Params, Post, ResMsg, User, Validate } from '../../najm';
import { isAdmin } from '../../auth';

import { accessResetUserParam, resetAccessDto, type ResetAccessDto } from './AccessResetDto';
import { AccessResetService } from './AccessResetService';
import type { AccessResetActor } from './AccessResetValidator';

/**
 * Administrative account recovery, reachable only over REST.
 *
 * This command replaces credentials and sends mail, so it is deliberately not
 * exposed as an MCP tool: that would need its own reviewed contract rather than
 * inheriting this one.
 */
@Controller('/admin/access/users')
@isAdmin()
export class AccessResetController {
  constructor(private accessResetService: AccessResetService) {}

  @Post('/:userId/reset-access')
  @Validate({ params: accessResetUserParam, body: resetAccessDto })
  @ResMsg('accessReset.success.reset')
  async resetAccess(
    @Params('userId') userId: string,
    @Body() body: ResetAccessDto,
    @User() actor: AccessResetActor,
  ) {
    return this.accessResetService.resetAccess(userId, body, actor);
  }
}
