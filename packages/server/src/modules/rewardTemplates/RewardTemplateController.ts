import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Validate } from '../../najm';
import { Can } from '../../auth';
import {
  createRewardTemplateDto,
  rewardTemplateIdParam,
  updateRewardTemplateDto,
  type CreateRewardTemplateDto,
  type UpdateRewardTemplateDto,
} from './RewardTemplateDto';
import { RewardTemplateService } from './RewardTemplateService';

/**
 * The reward bank. Whoever records rewards reads it to fill the reward form;
 * the roles screen decides who curates it. A school-wide catalog with no
 * owner and no school year, so it is not in `yearScope.ts`.
 */
@Controller('/behavior-reward-templates')
export class RewardTemplateController {
  constructor(private rewardTemplateService: RewardTemplateService) {}

  @Get()
  @Can('read:reward-templates')
  @ResMsg('rewardTemplates.success.retrieved')
  async list() {
    return this.rewardTemplateService.list();
  }

  @Get('/:id')
  @Can('read:reward-templates')
  @Validate({ params: rewardTemplateIdParam })
  @ResMsg('rewardTemplates.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.rewardTemplateService.getById(id);
  }

  @Post()
  @Can('create:reward-templates')
  @Validate(createRewardTemplateDto)
  @ResMsg('rewardTemplates.success.created')
  async create(@Body() body: CreateRewardTemplateDto, @User() actor: { id: string }) {
    return this.rewardTemplateService.create(body, actor);
  }

  @Put('/:id')
  @Can('update:reward-templates')
  @Validate({ params: rewardTemplateIdParam, body: updateRewardTemplateDto })
  @ResMsg('rewardTemplates.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateRewardTemplateDto) {
    return this.rewardTemplateService.update(id, body);
  }

  @Delete('/:id')
  @Can('delete:reward-templates')
  @Validate({ params: rewardTemplateIdParam })
  @ResMsg('rewardTemplates.success.deleted')
  async delete(@Params('id') id: string) {
    return this.rewardTemplateService.delete(id);
  }
}
