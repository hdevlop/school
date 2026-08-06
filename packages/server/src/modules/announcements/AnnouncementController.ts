import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Query, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '@server/auth';
import { AnnouncementService } from './AnnouncementService';
import {
  canAccessAnnouncement,
  canAccessAllAnnouncements,
  canCreateAnnouncement,
  canUpdateAnnouncement,
  canDeleteAnnouncement,
  canPublishAnnouncement,
} from './AnnouncementGuards';
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
@Controller('/announcements')
export class AnnouncementController {
  constructor(private announcementService: AnnouncementService) { }

  @Get()
  @canAccessAllAnnouncements()
  @McpTool('List all announcements')
  @ResMsg('announcements.success.retrieved')
  async getAnnouncements() {
    return this.announcementService.getAll();
  }

  @Get('/published')
  @McpTool('List published announcements')
  @ResMsg('announcements.success.retrieved')
  async getPublished() {
    return this.announcementService.getPublished();
  }

  @Get('/upcoming')
  @isAdmin()
  @McpTool('List upcoming announcements')
  @ResMsg('announcements.success.retrieved')
  async getUpcoming() {
    return this.announcementService.getUpcoming();
  }

  @Get('/expired')
  @isAdmin()
  @McpTool('List expired announcements')
  @ResMsg('announcements.success.retrieved')
  async getExpired() {
    return this.announcementService.getExpired();
  }

  @Get('/stats')
  @isAdmin()
  @McpTool('Get announcement statistics')
  @ResMsg('announcements.success.retrieved')
  async getStats() {
    return this.announcementService.getStats();
  }

  @Get('/recent')
  @canAccessAllAnnouncements()
  @McpTool('List recent announcements')
  @ResMsg('announcements.success.retrieved')
  async getRecent() {
    return this.announcementService.getRecent();
  }

  @Get('/author/:authorId')
  @isAdmin()
  @Validate({ params: announcementAuthorIdParam })
  @McpTool('Get announcements by author')
  @ResMsg('announcements.success.retrieved')
  async getByAuthor(@Params('authorId') authorId: string) {
    return this.announcementService.getByAuthor(authorId);
  }

  @Get('/audience/:targetAudience')
  @canAccessAllAnnouncements()
  @Validate({ params: announcementTargetAudienceParam })
  @McpTool('Get announcements by target audience')
  @ResMsg('announcements.success.retrieved')
  async getByTargetAudience(@Params('targetAudience') targetAudience: AnnouncementDtoShape['targetAudience']) {
    return this.announcementService.getByTargetAudience(targetAudience);
  }

  @Get('/class/:classId')
  @canAccessAllAnnouncements()
  @Validate({ params: announcementClassIdParam })
  @McpTool('Get announcements by class')
  @ResMsg('announcements.success.retrieved')
  async getByClass(@Params('classId') classId: string) {
    return this.announcementService.getByClass(classId);
  }

  @Get('/active/:targetAudience')
  @Validate({ params: announcementTargetAudienceParam, query: activeAnnouncementQueryDto })
  @McpTool('Get active announcements for an audience')
  @ResMsg('announcements.success.retrieved')
  async getActiveForAudience(
    @Params('targetAudience') targetAudience: AnnouncementDtoShape['targetAudience'],
    @Query() query: ActiveAnnouncementQueryDto = {},
  ) {
    return this.announcementService.getActiveForAudience(
      targetAudience,
      query.classId ?? undefined,
    );
  }

  @Get('/:id')
  @canAccessAnnouncement()
  @Validate({ params: announcementIdParam })
  @McpTool('Get an announcement by ID')
  @ResMsg('announcements.success.retrieved')
  async getAnnouncement(@Params('id') id: string) {
    return this.announcementService.getById(id);
  }

  @Post()
  @canCreateAnnouncement()
  @Validate(createAnnouncementDto)
  @McpTool('Create a new announcement')
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
  @canPublishAnnouncement()
  @Validate({ params: announcementIdParam })
  @McpTool('Publish an announcement')
  @ResMsg('announcements.success.published')
  async publish(@Params('id') id: string) {
    return this.announcementService.publish(id);
  }

  @Post('/:id/unpublish')
  @canPublishAnnouncement()
  @Validate({ params: announcementIdParam })
  @McpTool('Unpublish an announcement')
  @ResMsg('announcements.success.unpublished')
  async unpublish(@Params('id') id: string) {
    return this.announcementService.unpublish(id);
  }

  @Put('/:id')
  @canUpdateAnnouncement()
  @Validate({ params: announcementIdParam, body: updateAnnouncementDto })
  @McpTool('Update an announcement')
  @ResMsg('announcements.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateAnnouncementDto) {
    return this.announcementService.update(id, body);
  }

  @Delete('/bulk')
  @isAdmin()
  @Validate(deleteBulkAnnouncementDto)
  @McpTool('Delete multiple announcements by IDs')
  @ResMsg('announcements.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteBulkAnnouncementDto) {
    return this.announcementService.deleteBulk(body);
  }

  @Delete('/:id')
  @canDeleteAnnouncement()
  @Validate({ params: announcementIdParam })
  @McpTool('Delete an announcement')
  @ResMsg('announcements.success.deleted')
  async delete(@Params('id') id: string) {
    return this.announcementService.delete(id);
  }

  @Delete()
  @isAdmin()
  @McpTool('Delete all announcements')
  @ResMsg('announcements.success.allDeleted')
  async deleteAll() {
    return this.announcementService.deleteAll();
  }
}
