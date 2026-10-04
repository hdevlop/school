import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Query, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '../../auth';
import { AnnouncementService } from './AnnouncementService';
import { Announcement, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './AnnouncementGuards';
import type { AnnouncementActor } from './AnnouncementValidator';
import {
  activeAnnouncementQueryDto,
  announcementAuthorIdParam,
  announcementClassIdParam,
  announcementIdParam,
  announcementTargetAudienceParam,
  createAnnouncementDto,
  createAnnouncementsBulkDto,
  deleteBulkAnnouncementDto,
  updateAnnouncementDto,
  type ActiveAnnouncementQueryDto,
  type CreateAnnouncementDto,
  type CreateAnnouncementDto as AnnouncementDtoShape,
  type CreateAnnouncementsBulkDto,
  type DeleteBulkAnnouncementDto,
  type UpdateAnnouncementDto,
} from './AnnouncementDto';

@ToolGroup('announcements')
@Policy(Announcement)
@Controller('/announcements')
export class AnnouncementController {
  constructor(private announcementService: AnnouncementService) { }

  @Get()
  @CanList()
  @McpTool({ description: 'List all announcements', readOnly: true })
  @ResMsg('announcements.success.retrieved')
  async getAnnouncements() {
    return this.announcementService.getAll();
  }

  @Get('/published')
  @CanList()
  @McpTool({ description: 'List published announcements', readOnly: true })
  @ResMsg('announcements.success.retrieved')
  async getPublished() {
    return this.announcementService.getPublished();
  }

  @Get('/upcoming')
  @isAdmin()
  @McpTool({ description: 'List upcoming announcements', readOnly: true })
  @ResMsg('announcements.success.retrieved')
  async getUpcoming() {
    return this.announcementService.getUpcoming();
  }

  @Get('/expired')
  @isAdmin()
  @McpTool({ description: 'List expired announcements', readOnly: true })
  @ResMsg('announcements.success.retrieved')
  async getExpired() {
    return this.announcementService.getExpired();
  }

  @Get('/stats')
  @isAdmin()
  @McpTool({ description: 'Get announcement statistics', readOnly: true })
  @ResMsg('announcements.success.retrieved')
  async getStats() {
    return this.announcementService.getStats();
  }

  @Get('/recent')
  @CanList()
  @McpTool({ description: 'List recent announcements. Dernières annonces. آخر الإعلانات.', readOnly: true })
  @ResMsg('announcements.success.retrieved')
  async getRecent() {
    return this.announcementService.getRecent();
  }

  @Get('/author/:authorId')
  @isAdmin()
  @Validate({ params: announcementAuthorIdParam })
  @McpTool({ description: 'Get announcements by author', readOnly: true })
  @ResMsg('announcements.success.retrieved')
  async getByAuthor(@Params('authorId') authorId: string) {
    return this.announcementService.getByAuthor(authorId);
  }

  @Get('/audience/:targetAudience')
  @CanList()
  @Validate({ params: announcementTargetAudienceParam })
  @McpTool({ description: 'Get announcements by target audience', readOnly: true })
  @ResMsg('announcements.success.retrieved')
  async getByTargetAudience(@Params('targetAudience') targetAudience: AnnouncementDtoShape['targetAudience']) {
    return this.announcementService.getByTargetAudience(targetAudience);
  }

  @Get('/class/:classId')
  @CanList()
  @Validate({ params: announcementClassIdParam })
  @McpTool({ description: 'Get announcements by class', readOnly: true })
  @ResMsg('announcements.success.retrieved')
  async getByClass(@Params('classId') classId: string) {
    return this.announcementService.getByClass(classId);
  }

  @Get('/active/:targetAudience')
  @CanList()
  @Validate({ params: announcementTargetAudienceParam, query: activeAnnouncementQueryDto })
  @McpTool({ description: 'Get active announcements for an audience', readOnly: true })
  @ResMsg('announcements.success.retrieved')
  async getActiveForAudience(
    @Params('targetAudience') targetAudience: AnnouncementDtoShape['targetAudience'],
    @Query() query: ActiveAnnouncementQueryDto,
  ) {
    return this.announcementService.getActiveForAudience(
      targetAudience,
      query?.classId ?? undefined,
    );
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: announcementIdParam })
  @McpTool({ description: 'Get an announcement by ID', readOnly: true })
  @ResMsg('announcements.success.retrieved')
  async getAnnouncementById(@Params('id') id: string) {
    return this.announcementService.getById(id);
  }

  @Post()
  @CanCreate()
  @Validate(createAnnouncementDto)
  @McpTool({ description: 'Create a new announcement', confirm: { level: 'warning', message: 'confirm.announcements.create' } })
  @ResMsg('announcements.success.created')
  async create(@Body() body: CreateAnnouncementDto, @User() user: { id: string }) {
    return this.announcementService.create({
      ...body,
      authorId: user.id,
    });
  }

  @Post('/seed')
  @isAdmin()
  @Validate(createAnnouncementsBulkDto)
  @ResMsg('announcements.success.seeded')
  async createBulk(@Body() body: CreateAnnouncementsBulkDto) {
    return this.announcementService.createBulk(body);
  }

  @Post('/:id/publish')
  @CanUpdate()
  @Validate({ params: announcementIdParam })
  @McpTool({ description: 'Publish an announcement', confirm: { level: 'warning', message: 'confirm.announcements.publish' } })
  @ResMsg('announcements.success.published')
  async publish(@Params('id') id: string, @User() actor: AnnouncementActor) {
    return this.announcementService.publish(id, actor);
  }

  @Post('/:id/unpublish')
  @CanUpdate()
  @Validate({ params: announcementIdParam })
  @McpTool({ description: 'Unpublish an announcement', confirm: { level: 'warning', message: 'confirm.announcements.unpublish' } })
  @ResMsg('announcements.success.unpublished')
  async unpublish(@Params('id') id: string, @User() actor: AnnouncementActor) {
    return this.announcementService.unpublish(id, actor);
  }

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: announcementIdParam, body: updateAnnouncementDto })
  @McpTool({ description: 'Update an announcement', confirm: { level: 'warning', message: 'confirm.announcements.update' } })
  @ResMsg('announcements.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateAnnouncementDto, @User() actor: AnnouncementActor) {
    return this.announcementService.update(id, body, actor);
  }

  @Delete('/bulk')
  @isAdmin()
  @Validate(deleteBulkAnnouncementDto)
  @McpTool('Delete multiple announcements by IDs')
  @ResMsg('announcements.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteBulkAnnouncementDto, @User() actor: AnnouncementActor) {
    return this.announcementService.deleteBulk(body, actor);
  }

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: announcementIdParam })
  @McpTool('Delete an announcement')
  @ResMsg('announcements.success.deleted')
  async deleteById(@Params('id') id: string, @User() actor: AnnouncementActor) {
    return this.announcementService.delete(id, actor);
  }

  @Delete()
  @isAdmin()
  @McpTool('Delete all announcements')
  @ResMsg('announcements.success.allDeleted')
  async deleteAll() {
    return this.announcementService.deleteAll();
  }
}
