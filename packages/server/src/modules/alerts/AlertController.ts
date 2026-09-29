import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Query, User, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '../../auth';
import { AlertService } from './AlertService';
import { Alert, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './AlertGuards';
import type { AlertActor } from './AlertValidator';
import {
  alertClassIdParam,
  alertIdParam,
  alertPriorityParam,
  alertStatusParam,
  alertStudentIdParam,
  alertSubjectIdParam,
  alertTeacherIdParam,
  alertTypeParam,
  createAlertDto,
  recentAlertsByHoursQueryDto,
  recentAlertsQueryDto,
  updateAlertDto,
  updateAlertStatusDto,
  type CreateAlertDto,
  type RecentAlertsByHoursQueryDto,
  type RecentAlertsQueryDto,
  type UpdateAlertStatusDto,
  type UpdateAlertDto,
} from './AlertDto';

@ToolGroup('alerts')
@Policy(Alert)
@Controller('/alerts')
export class AlertController {
  constructor(private alertService: AlertService) { }

  @Get()
  @CanList()
  @McpTool('List all alerts')
  @ResMsg('alerts.success.retrieved')
  async getAlerts() {
    return this.alertService.getAll();
  }

  @Get('/count')
  @CanList()
  @McpTool('Get total alert count')
  @ResMsg('alerts.success.retrieved')
  async getAlertsCount() {
    return this.alertService.getCount();
  }

  @Get('/status-counts')
  @CanList()
  @McpTool('Get alert counts grouped by status')
  @ResMsg('alerts.success.retrieved')
  async getStatusCounts() {
    return this.alertService.getStatusCounts();
  }

  @Get('/priority-counts')
  @CanList()
  @McpTool('Get alert counts grouped by priority')
  @ResMsg('alerts.success.retrieved')
  async getPriorityCounts() {
    return this.alertService.getPriorityCounts();
  }

  @Get('/type-counts')
  @CanList()
  @McpTool('Get alert counts grouped by type')
  @ResMsg('alerts.success.retrieved')
  async getTypeCounts() {
    return this.alertService.getTypeCounts();
  }

  @Get('/active')
  @CanList()
  @McpTool('List active (unresolved) alerts')
  @ResMsg('alerts.success.retrieved')
  async getActiveAlerts() {
    return this.alertService.getActiveAlerts();
  }

  @Get('/critical')
  @CanList()
  @McpTool('List critical priority alerts')
  @ResMsg('alerts.success.retrieved')
  async getCriticalAlerts() {
    return this.alertService.getCriticalAlerts();
  }

  @Get('/recent')
  @CanList()
  @Validate({ query: recentAlertsQueryDto })
  @McpTool('List recent alerts')
  @ResMsg('alerts.success.retrieved')
  async getRecentAlerts(@Query() query: RecentAlertsQueryDto) {
    return this.alertService.getRecentAlerts(query.limit ?? 10);
  }

  @Get('/recent-by-hours')
  @CanList()
  @Validate({ query: recentAlertsByHoursQueryDto })
  @McpTool('List alerts from the last N hours')
  @ResMsg('alerts.success.retrieved')
  async getRecentAlertsByHours(@Query() query: RecentAlertsByHoursQueryDto) {
    return this.alertService.getRecentAlertsByHours(query.hours ?? 24);
  }

  @Get('/dashboard')
  @CanList()
  @McpTool('Get alert dashboard summary')
  @ResMsg('alerts.success.retrieved')
  async getDashboardSummary() {
    return this.alertService.getDashboardSummary();
  }

  @Get('/type/:type')
  @CanList()
  @Validate({ params: alertTypeParam })
  @McpTool('Get alerts by type')
  @ResMsg('alerts.success.retrieved')
  async getAlertsByType(@Params('type') type: string) {
    return this.alertService.getByType(type);
  }

  @Get('/status/:status')
  @CanList()
  @Validate({ params: alertStatusParam })
  @McpTool('Get alerts by status')
  @ResMsg('alerts.success.retrieved')
  async getAlertsByStatus(@Params('status') status: string) {
    return this.alertService.getByStatus(status);
  }

  @Get('/priority/:priority')
  @CanList()
  @Validate({ params: alertPriorityParam })
  @McpTool('Get alerts by priority')
  @ResMsg('alerts.success.retrieved')
  async getAlertsByPriority(@Params('priority') priority: string) {
    return this.alertService.getByPriority(priority);
  }

  @Get('/student/:studentId')
  @CanList()
  @Validate({ params: alertStudentIdParam })
  @McpTool('Get alerts for a student')
  @ResMsg('alerts.success.retrieved')
  async getAlertsByStudent(@Params('studentId') studentId: string) {
    return this.alertService.getByStudentId(studentId);
  }

  @Get('/teacher/:teacherId')
  @CanList()
  @Validate({ params: alertTeacherIdParam })
  @McpTool('Get alerts for a teacher')
  @ResMsg('alerts.success.retrieved')
  async getAlertsByTeacher(@Params('teacherId') teacherId: string) {
    return this.alertService.getByTeacherId(teacherId);
  }

  @Get('/class/:classId')
  @CanList()
  @Validate({ params: alertClassIdParam })
  @McpTool('Get alerts for a class')
  @ResMsg('alerts.success.retrieved')
  async getAlertsByClass(@Params('classId') classId: string) {
    return this.alertService.getByClassId(classId);
  }

  @Get('/subject/:subjectId')
  @CanList()
  @Validate({ params: alertSubjectIdParam })
  @McpTool('Get alerts for a subject')
  @ResMsg('alerts.success.retrieved')
  async getAlertsBySubject(@Params('subjectId') subjectId: string) {
    return this.alertService.getBySubjectId(subjectId);
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: alertIdParam })
  @McpTool('Get an alert by ID')
  @ResMsg('alerts.success.retrieved')
  async getAlertById(@Params('id') id: string) {
    return this.alertService.getById(id);
  }

  @Post()
  @CanCreate()
  @Validate(createAlertDto)
  @McpTool('Create a new alert')
  @ResMsg('alerts.success.created')
  async create(@Body() alertData: CreateAlertDto) {
    return this.alertService.create(alertData);
  }

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: alertIdParam, body: updateAlertDto })
  @McpTool('Update an alert')
  @ResMsg('alerts.success.updated')
  async update(@Params('id') id: string, @Body() updateData: UpdateAlertDto, @User() actor: AlertActor) {
    return this.alertService.update(id, updateData, actor);
  }

  @Put('/:id/status')
  @CanUpdate()
  @Validate({ params: alertIdParam, body: updateAlertStatusDto })
  @McpTool('Update alert status (e.g. mark as read)')
  @ResMsg('alerts.success.statusUpdated')
  async updateStatus(@Params('id') id: string, @Body() body: UpdateAlertStatusDto, @User() actor: AlertActor) {
    return this.alertService.updateStatus(id, body.status, actor);
  }

  @Delete('/resolved')
  @isAdmin()
  @McpTool('Delete all resolved alerts')
  @ResMsg('alerts.success.resolvedDeleted')
  async deleteResolved() {
    return this.alertService.deleteResolved();
  }

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: alertIdParam })
  @McpTool('Delete an alert by ID')
  @ResMsg('alerts.success.deleted')
  async delete(@Params('id') id: string) {
    return this.alertService.delete(id);
  }

  @Delete()
  @isAdmin()
  @McpTool('Delete all alerts')
  @ResMsg('alerts.success.allDeleted')
  async deleteAll() {
    return this.alertService.deleteAll();
  }

}
