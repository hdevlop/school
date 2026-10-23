import { isAdmin } from '../../auth';
import { Body, Controller, Get, Params, Post, Put, ResMsg, User, Validate } from '../../najm';
import { roleAccessParam, saveRoleAccessDto, type SaveRoleAccessDto } from './RoleAccessDto';
import { RoleAccessService } from './RoleAccessService';

/** School's review-and-save role editor, using the built-in auth grants. REST only. */
@Controller('/admin/access/roles')
@isAdmin()
export class RoleAccessController {
  constructor(private roleAccess: RoleAccessService) {}

  @Post('/migrate-actions')
  @ResMsg('roleAccess.saved')
  migrateActions(@User('id') actorId: string) {
    return this.roleAccess.migrateActions(actorId);
  }

  @Get('/:roleId')
  @Validate({ params: roleAccessParam })
  @ResMsg('roleAccess.loaded')
  get(@Params('roleId') roleId: string) {
    return this.roleAccess.get(roleId);
  }

  @Put('/:roleId')
  @Validate({ params: roleAccessParam, body: saveRoleAccessDto })
  @ResMsg('roleAccess.saved')
  save(@Params('roleId') roleId: string, @Body() body: SaveRoleAccessDto, @User('id') actorId: string) {
    return this.roleAccess.save(roleId, body, actorId);
  }
}
