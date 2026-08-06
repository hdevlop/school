import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Query, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '@server/auth';
import { EventService } from './EventService';
import {
  canAccessEvent,
  canAccessAllEvents,
  canCreateEvent,
  canUpdateEvent,
  canDeleteEvent,
  canManageParticipants,
} from './EventGuards';
import {
  createEventDto,
  createEventParticipantDto,
  dateRangeDto,
  eventClassIdParam,
  eventIdParam,
  eventParticipantIdParam,
  eventOrganizerIdParam,
  eventParticipantLookupParam,
  eventParticipantsByTypeParam,
  eventSectionIdParam,
  eventStatusParam,
  eventTypeParam,
  eventVisibilityParam,
  markAttendanceDto,
  postponeEventDto,
  type DateRangeDto,
  type MarkAttendanceDto,
  type PostponeEventDto,
  updateEventDto,
  updateEventParticipantDto,
  type CreateEventDto,
  type CreateEventParticipantDto,
  type UpdateEventDto,
  type UpdateEventParticipantDto,
} from './EventDto';

@ToolGroup('events')
@Controller('/events')
export class EventController {
  constructor(private eventService: EventService) { }

  @Get()
  @canAccessAllEvents()
  @McpTool('List all events')
  @ResMsg('events.success.retrieved')
  async getEvents() {
    return this.eventService.getAll();
  }

  @Get('/today')
  @ResMsg('events.success.retrieved')
  @McpTool("List today's active events")
  async getToday() {
    return this.eventService.getTodayEvents();
  }

  @Get('/upcoming')
  @ResMsg('events.success.retrieved')
  @McpTool('List upcoming events')
  async getUpcoming() {
    return this.eventService.getUpcoming();
  }

  @Get('/past')
  @ResMsg('events.success.retrieved')
  @McpTool('List past events')
  async getPast() {
    return this.eventService.getPast();
  }

  @Get('/active')
  @ResMsg('events.success.retrieved')
  @McpTool('List currently active events')
  async getActive() {
    return this.eventService.getActiveEvents();
  }

  @Get('/status/:status')
  @canAccessAllEvents()
  @Validate({ params: eventStatusParam })
  @McpTool('Get events by status')
  @ResMsg('events.success.retrieved')
  async getByStatus(@Params('status') status: string) {
    return this.eventService.getByStatus(status);
  }

  @Get('/type/:type')
  @Validate({ params: eventTypeParam })
  @McpTool('Get events by type')
  @ResMsg('events.success.retrieved')
  async getByType(@Params('type') type: string) {
    return this.eventService.getByType(type);
  }

  @Get('/organizer/:organizerId')
  @canAccessAllEvents()
  @Validate({ params: eventOrganizerIdParam })
  @ResMsg('events.success.retrieved')
  async getByOrganizer(@Params('organizerId') organizerId: string) {
    return this.eventService.getByOrganizer(organizerId);
  }

  @Get('/class/:classId')
  @Validate({ params: eventClassIdParam })
  @McpTool('Get events by class')
  @ResMsg('events.success.retrieved')
  async getByClass(@Params('classId') classId: string) {
    return this.eventService.getByClass(classId);
  }

  @Get('/section/:sectionId')
  @Validate({ params: eventSectionIdParam })
  @McpTool('Get events by section')
  @ResMsg('events.success.retrieved')
  async getBySection(@Params('sectionId') sectionId: string) {
    return this.eventService.getBySection(sectionId);
  }

  @Get('/visibility/:visibility')
  @canAccessAllEvents()
  @Validate({ params: eventVisibilityParam })
  @ResMsg('events.success.retrieved')
  async getByVisibility(@Params('visibility') visibility: string) {
    return this.eventService.getByVisibility(visibility);
  }

  @Get('/date-range')
  @Validate({ query: dateRangeDto })
  @ResMsg('events.success.retrieved')
  async getByDateRange(@Query() query: DateRangeDto) {
    return this.eventService.getByDateRange(query.startDate, query.endDate);
  }

  @Post('/mcp/date-range')
  @Validate({ body: dateRangeDto })
  @McpTool('Get events within a date range')
  @ResMsg('events.success.retrieved')
  async getByDateRangeMcp(@Body() body: DateRangeDto) {
    return this.eventService.getByDateRange(body.startDate, body.endDate);
  }

  @Get('/analytics')
  @isAdmin()
  @McpTool('Get event analytics')
  @ResMsg('events.success.retrieved')
  async getAnalytics() {
    return this.eventService.getEventAnalytics();
  }

  @Get('/analytics/type-count')
  @isAdmin()
  @ResMsg('events.success.retrieved')
  async getTypeCount() {
    return this.eventService.getEventsByTypeCount();
  }

  @Get('/:id')
  @canAccessEvent()
  @Validate({ params: eventIdParam })
  @McpTool('Get an event by ID')
  @ResMsg('events.success.retrieved')
  async getEvent(@Params('id') id: string) {
    return this.eventService.getById(id);
  }

  @Post()
  @canCreateEvent()
  @Validate(createEventDto)
  @ResMsg('events.success.created')
  async create(@Body() body: CreateEventDto, @User() user: { id: string }) {
    return this.eventService.create({
      ...body,
      organizerId: user.id,
    });
  }

  @Put('/:id')
  @canUpdateEvent()
  @Validate({ params: eventIdParam, body: updateEventDto })
  @ResMsg('events.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateEventDto) {
    return this.eventService.update(id, body);
  }

  @Delete('/:id')
  @canDeleteEvent()
  @Validate({ params: eventIdParam })
  @ResMsg('events.success.deleted')
  async delete(@Params('id') id: string) {
    return this.eventService.delete(id);
  }

  @Delete()
  @isAdmin()
  @ResMsg('events.success.allDeleted')
  async deleteAll() {
    return this.eventService.deleteAll();
  }

  @Post('/:id/start')
  @canUpdateEvent()
  @Validate({ params: eventIdParam })
  @ResMsg('events.success.started')
  async startEvent(@Params('id') id: string) {
    return this.eventService.startEvent(id);
  }

  @Post('/:id/complete')
  @canUpdateEvent()
  @Validate({ params: eventIdParam })
  @ResMsg('events.success.completed')
  async completeEvent(@Params('id') id: string) {
    return this.eventService.completeEvent(id);
  }

  @Post('/:id/cancel')
  @canUpdateEvent()
  @Validate({ params: eventIdParam })
  @ResMsg('events.success.cancelled')
  async cancelEvent(@Params('id') id: string) {
    return this.eventService.cancelEvent(id);
  }

  @Post('/:id/postpone')
  @canUpdateEvent()
  @Validate({ params: eventIdParam, body: postponeEventDto })
  @ResMsg('events.success.postponed')
  async postponeEvent(@Params('id') id: string, @Body() body: PostponeEventDto) {
    return this.eventService.postponeEvent(id, body.newStartDate, body.newEndDate);
  }

  @Get('/:id/participants')
  @canAccessEvent()
  @Validate({ params: eventIdParam })
  @ResMsg('events.success.participantsRetrieved')
  async getParticipants(@Params('id') id: string) {
    return this.eventService.getParticipants(id);
  }

  @Get('/:id/participants/:type')
  @canAccessEvent()
  @Validate({ params: eventParticipantsByTypeParam })
  @ResMsg('events.success.participantsRetrieved')
  async getParticipantsByType(@Params('id') id: string, @Params('type') type: string) {
    return this.eventService.getParticipantsByType(id, type);
  }

  @Get('/participant/:participantId')
  @Validate({ params: eventParticipantLookupParam })
  @ResMsg('events.success.retrieved')
  async getEventsByParticipant(@Params('participantId') participantId: string) {
    return this.eventService.getEventsByParticipant(participantId);
  }

  @Get('/:id/participants/count')
  @canAccessEvent()
  @Validate({ params: eventIdParam })
  @ResMsg('events.success.retrieved')
  async getParticipantCount(@Params('id') id: string) {
    const count = await this.eventService.getParticipantCount(id);
    return { count };
  }

  @Post('/participants')
  @canManageParticipants()
  @Validate(createEventParticipantDto)
  @ResMsg('events.success.participantAdded')
  async addParticipant(@Body() body: CreateEventParticipantDto) {
    return this.eventService.addParticipant(body);
  }

  @Put('/participants/:id')
  @canManageParticipants()
  @Validate({ params: eventParticipantIdParam, body: updateEventParticipantDto })
  @ResMsg('events.success.participantUpdated')
  async updateParticipant(@Params('id') id: string, @Body() body: UpdateEventParticipantDto) {
    return this.eventService.updateParticipant(id, body);
  }

  @Delete('/participants/:id')
  @canManageParticipants()
  @Validate({ params: eventParticipantIdParam })
  @ResMsg('events.success.participantRemoved')
  async removeParticipant(@Params('id') id: string) {
    return this.eventService.removeParticipant(id);
  }

  @Post('/participants/:id/attendance')
  @canManageParticipants()
  @Validate({ params: eventParticipantIdParam, body: markAttendanceDto })
  @ResMsg('events.success.attendanceMarked')
  async markAttendance(@Params('id') id: string, @Body() body: MarkAttendanceDto) {
    return this.eventService.markAttendance(id, body.status);
  }
}
