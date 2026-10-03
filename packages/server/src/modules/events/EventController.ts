import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Query, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin, isAuth } from '../../auth';
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

// Every route needs a signed-in user; the read guards below need `read:events`,
// and the repository then limits rows to the reader's audience and the selected year.
@ToolGroup('events')
@Controller('/events')
@isAuth()
export class EventController {
  constructor(private eventService: EventService) { }

  @Get()
  @canAccessAllEvents()
  @McpTool({ description: 'List all events', readOnly: true })
  @ResMsg('events.success.retrieved')
  async getEvents() {
    return this.eventService.getAll();
  }

  @Get('/today')
  @canAccessAllEvents()
  @ResMsg('events.success.retrieved')
  @McpTool({ description: "List today's active events", readOnly: true })
  async getToday() {
    return this.eventService.getTodayEvents();
  }

  @Get('/upcoming')
  @canAccessAllEvents()
  @ResMsg('events.success.retrieved')
  @McpTool({ description: 'List upcoming events', readOnly: true })
  async getUpcoming() {
    return this.eventService.getUpcoming();
  }

  @Get('/past')
  @canAccessAllEvents()
  @ResMsg('events.success.retrieved')
  @McpTool({ description: 'List past events', readOnly: true })
  async getPast() {
    return this.eventService.getPast();
  }

  @Get('/active')
  @canAccessAllEvents()
  @ResMsg('events.success.retrieved')
  @McpTool({ description: 'List currently active events', readOnly: true })
  async getActive() {
    return this.eventService.getActiveEvents();
  }

  @Get('/status/:status')
  @canAccessAllEvents()
  @Validate({ params: eventStatusParam })
  @McpTool({ description: 'Get events by status', readOnly: true })
  @ResMsg('events.success.retrieved')
  async getByStatus(@Params('status') status: string) {
    return this.eventService.getByStatus(status);
  }

  @Get('/type/:type')
  @canAccessAllEvents()
  @Validate({ params: eventTypeParam })
  @McpTool({ description: 'Get events by type', readOnly: true })
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
  @canAccessAllEvents()
  @Validate({ params: eventClassIdParam })
  @McpTool({ description: 'Get events by class', readOnly: true })
  @ResMsg('events.success.retrieved')
  async getByClass(@Params('classId') classId: string) {
    return this.eventService.getByClass(classId);
  }

  @Get('/section/:sectionId')
  @canAccessAllEvents()
  @Validate({ params: eventSectionIdParam })
  @McpTool({ description: 'Get events by section', readOnly: true })
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
  @canAccessAllEvents()
  @Validate({ query: dateRangeDto })
  @ResMsg('events.success.retrieved')
  async getByDateRange(@Query() query: DateRangeDto) {
    return this.eventService.getByDateRange(query.startDate, query.endDate);
  }

  @Post('/mcp/date-range')
  @canAccessAllEvents()
  @Validate({ body: dateRangeDto })
  @McpTool({ description: 'Get events within a date range', readOnly: true })
  @ResMsg('events.success.retrieved')
  async getByDateRangeMcp(@Body() body: DateRangeDto) {
    return this.eventService.getByDateRange(body.startDate, body.endDate);
  }

  @Get('/analytics')
  @isAdmin()
  @McpTool({ description: 'Get event analytics', readOnly: true })
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
  @McpTool({ description: 'Get an event by ID', readOnly: true })
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
  @canManageParticipants()
  @Validate({ params: eventIdParam })
  @ResMsg('events.success.participantsRetrieved')
  async getParticipants(@Params('id') id: string) {
    return this.eventService.getParticipants(id);
  }

  @Get('/:id/participants/:type')
  @canManageParticipants()
  @Validate({ params: eventParticipantsByTypeParam })
  @ResMsg('events.success.participantsRetrieved')
  async getParticipantsByType(@Params('id') id: string, @Params('type') type: string) {
    return this.eventService.getParticipantsByType(id, type);
  }

  @Get('/participant/:participantId')
  @canManageParticipants()
  @Validate({ params: eventParticipantLookupParam })
  @ResMsg('events.success.retrieved')
  async getEventsByParticipant(@Params('participantId') participantId: string) {
    return this.eventService.getEventsByParticipant(participantId);
  }

  @Get('/:id/participants/count')
  @canManageParticipants()
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
