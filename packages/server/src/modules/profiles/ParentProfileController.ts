import { Controller, Get, Params, ResMsg, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { ParentProfileService } from './ParentProfileService';
import { Can, isAuth } from '../../auth';
import { z } from 'zod';

const parentIdParam = z.object({ parentId: z.string().min(1) });

// Each tab asks for what its data's own module asks for on its routes. The
// children with their fees and the debts across years ask for read:fees, which
// parents hold (migration 0124): the parent is loaded through ownership first,
// so a parent ID other than the reader's own is a 404, and only the children
// the reader may read are listed. The fee modules' own routes have no
// ownership rules and stay school-wide.
@ToolGroup('parent-profile')
@Controller('/profiles/parents')
@isAuth()
export class ParentProfileController {
  constructor(private parentProfileService: ParentProfileService) {}

  @Get('/:parentId/unread-alerts')
  @Can('read:alerts')
  @Validate({ params: parentIdParam })
  @McpTool({ description: 'Get unread alerts aggregated across all children for a parent', readOnly: true })
  @ResMsg('parents.success.retrieved')
  async getUnreadAlerts(@Params('parentId') parentId: string) {
    return this.parentProfileService.getUnreadAlerts(parentId);
  }

  // The year hook declares `academicYear` for every tool of this controller.
  @Get('/:parentId/children')
  @Can('read:fees')
  @Validate({ params: parentIdParam })
  @McpTool({ description: 'Get children for a parent with their class and fees in the academic year', readOnly: true })
  @ResMsg('parents.success.retrieved')
  async getChildren(@Params('parentId') parentId: string) {
    return this.parentProfileService.getChildren(parentId);
  }

  @Get('/:parentId/fees-due')
  @Can('read:fees')
  @Validate({ params: parentIdParam })
  @McpTool({ description: "Get every academic year's fees of all children for a parent", readOnly: true })
  @ResMsg('parents.success.retrieved')
  async getAllFeesDue(@Params('parentId') parentId: string) {
    return this.parentProfileService.getFeesDue(parentId);
  }

  @Get('/:parentId/upcoming-events')
  @Can('read:events')
  @Validate({ params: parentIdParam })
  @McpTool({ description: "Get the academic year's upcoming events a parent sees: the school's and their children's classes'", readOnly: true })
  @ResMsg('parents.success.retrieved')
  async getAllUpcomingEvents(@Params('parentId') parentId: string) {
    return this.parentProfileService.getUpcomingEvents(parentId);
  }
}
