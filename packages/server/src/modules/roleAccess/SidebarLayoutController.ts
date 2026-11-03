import { isAuth } from '../../auth';
import { Controller, Get, ResMsg, User } from '../../najm';
import { RoleAccessService } from './RoleAccessService';

/** Display preferences for the caller's own role; this grants no page access. */
@Controller('/navigation/sidebar')
@isAuth()
export class SidebarLayoutController {
  constructor(private roleAccess: RoleAccessService) {}

  @Get()
  @ResMsg('roleAccess.loaded')
  getMine(@User('id') userId: string) {
    return this.roleAccess.getOwnSidebarOrder(userId);
  }
}
