import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import {
  behaviorRewardIdParam,
  createBehaviorRewardDto,
  updateBehaviorRewardDto,
  type CreateBehaviorRewardDto,
  type UpdateBehaviorRewardDto,
} from './BehaviorRewardDto';
import {
  canCreateBehaviorRewards,
  canDeleteBehaviorRewards,
  canListBehaviorRewards,
  canReadBehaviorRewards,
  canUpdateBehaviorRewards,
} from './BehaviorRewardGuards';
import { BehaviorRewardService } from './BehaviorRewardService';
import type { BehaviorRewardActor } from './BehaviorRewardValidator';

@ToolGroup('behavior_rewards')
@Controller('/behavior-rewards')
export class BehaviorRewardController {
  constructor(private behaviorRewardService: BehaviorRewardService) {}

  @Get()
  @canListBehaviorRewards()
  @McpTool({ description: 'List authorized positive behavior and reward records', readOnly: true })
  @ResMsg('behaviorRewards.success.retrieved')
  async list() {
    return this.behaviorRewardService.list();
  }

  @Get('/:id')
  @canReadBehaviorRewards()
  @Validate({ params: behaviorRewardIdParam })
  @McpTool({ description: 'Get a positive behavior and reward record by ID', readOnly: true })
  @ResMsg('behaviorRewards.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.behaviorRewardService.getById(id);
  }

  @Post()
  @canCreateBehaviorRewards()
  @Validate(createBehaviorRewardDto)
  @McpTool({ description: 'Create a positive behavior and reward record', idempotent: false, confirm: { level: 'warning', message: 'confirm.behaviorRewards.create' } })
  @ResMsg('behaviorRewards.success.created')
  async create(@Body() body: CreateBehaviorRewardDto, @User() actor: BehaviorRewardActor) {
    return this.behaviorRewardService.create(body, actor);
  }

  @Put('/:id')
  @canUpdateBehaviorRewards()
  @Validate({ params: behaviorRewardIdParam, body: updateBehaviorRewardDto })
  @McpTool({ description: 'Update a positive behavior and reward record', confirm: { level: 'warning', message: 'confirm.behaviorRewards.update' } })
  @ResMsg('behaviorRewards.success.updated')
  async update(
    @Params('id') id: string,
    @Body() body: UpdateBehaviorRewardDto,
    @User() actor: BehaviorRewardActor,
  ) {
    return this.behaviorRewardService.update(id, body, actor);
  }

  @Delete('/:id')
  @canDeleteBehaviorRewards()
  @Validate({ params: behaviorRewardIdParam })
  @McpTool({ description: 'Delete an incorrect positive behavior and reward record', destructive: true, confirm: { level: 'danger', message: 'confirm.behaviorRewards.delete' } })
  @ResMsg('behaviorRewards.success.deleted')
  async delete(@Params('id') id: string, @User() actor: BehaviorRewardActor) {
    return this.behaviorRewardService.delete(id, actor);
  }
}
