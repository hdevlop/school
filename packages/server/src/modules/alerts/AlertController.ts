import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Query, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '@server/auth';
import { AlertService } from './AlertService';
import {
  announcementAlertDto,
  alertClassIdParam,
  alertIdParam,
  alertPriorityParam,
  alertStatusParam,
  alertStudentIdParam,
  alertSubjectIdParam,
  alertTeacherIdParam,
  alertTypeParam,
  createAlertDto,
  emergencyAlertDto,
  recentAlertsByHoursQueryDto,
  recentAlertsQueryDto,
  reminderAlertDto,
  systemAlertDto,
  typedStudentAlertDto,
  updateAlertDto,
  updateAlertStatusDto,
  type AnnouncementAlertDto,
  type CreateAlertDto,
  type EmergencyAlertDto,
  type RecentAlertsByHoursQueryDto,
  type RecentAlertsQueryDto,
  type ReminderAlertDto,
  type SystemAlertDto,
  type TypedStudentAlertDto,
  type UpdateAlertStatusDto,
  type UpdateAlertDto,
} from './AlertDto';

@ToolGroup('alerts')
@Controller('/alerts')
@isAdmin()
export class AlertController {
  constructor(private alertService: AlertService) { }

  @Get()
  @McpTool('List all alerts')
  @ResMsg('alerts.success.retrieved')
  async getAlerts() {
    return this.alertService.getAll();
  }

  @Get('/count')
  @McpTool('Get total alert count')
  @ResMsg('alerts.success.retrieved')
  async getAlertsCount() {
    return this.alertService.getCount();
  }

  @Get('/status-counts')
  @McpTool('Get alert counts grouped by status')
  @ResMsg('alerts.success.retrieved')
  async getStatusCounts() {
    return this.alertService.getStatusCounts();
  }

  @Get('/priority-counts')
  @McpTool('Get alert counts grouped by priority')
  @ResMsg('alerts.success.retrieved')
  async getPriorityCounts() {
    return this.alertService.getPriorityCounts();
  }

  @Get('/type-counts')
  @McpTool('Get alert counts grouped by type')
  @ResMsg('alerts.success.retrieved')
  async getTypeCounts() {
    return this.alertService.getTypeCounts();
  }

  @Get('/active')
  @McpTool('List active (unresolved) alerts')
  @ResMsg('alerts.success.retrieved')
  async getActiveAlerts() {
    return this.alertService.getActiveAlerts();
  }

  @Get('/critical')
  @McpTool('List critical priority alerts')
  @ResMsg('alerts.success.retrieved')
  async getCriticalAlerts() {
    return this.alertService.getCriticalAlerts();
  }

  @Get('/recent')
  @Validate({ query: recentAlertsQueryDto })
  @McpTool('List recent alerts')
  @ResMsg('alerts.success.retrieved')
  async getRecentAlerts(@Query() query: RecentAlertsQueryDto) {
    return this.alertService.getRecentAlerts(query.limit ?? 10);
  }

  @Get('/recent-by-hours')
  @Validate({ query: recentAlertsByHoursQueryDto })
  @McpTool('List alerts from the last N hours')
  @ResMsg('alerts.success.retrieved')
  async getRecentAlertsByHours(@Query() query: RecentAlertsByHoursQueryDto) {
    return this.alertService.getRecentAlertsByHours(query.hours ?? 24);
  }

  @Get('/dashboard')
  @McpTool('Get alert dashboard summary')
  @ResMsg('alerts.success.retrieved')
  async getDashboardSummary() {
    return this.alertService.getDashboardSummary();
  }

  @Get('/type/:type')
  @Validate({ params: alertTypeParam })
  @McpTool('Get alerts by type')
  @ResMsg('alerts.success.retrieved')
  async getAlertsByType(@Params('type') type: string) {
    return this.alertService.getByType(type);
  }

  @Get('/status/:status')
  @Validate({ params: alertStatusParam })
  @McpTool('Get alerts by status')
  @ResMsg('alerts.success.retrieved')
  async getAlertsByStatus(@Params('status') status: string) {
    return this.alertService.getByStatus(status);
  }

  @Get('/priority/:priority')
  @Validate({ params: alertPriorityParam })
  @McpTool('Get alerts by priority')
  @ResMsg('alerts.success.retrieved')
  async getAlertsByPriority(@Params('priority') priority: string) {
    return this.alertService.getByPriority(priority);
  }

  @Get('/student/:studentId')
  @Validate({ params: alertStudentIdParam })
  @McpTool('Get alerts for a student')
  @ResMsg('alerts.success.retrieved')
  async getAlertsByStudent(@Params('studentId') studentId: string) {
    return this.alertService.getByStudentId(studentId);
  }

  @Get('/teacher/:teacherId')
  @Validate({ params: alertTeacherIdParam })
  @McpTool('Get alerts for a teacher')
  @ResMsg('alerts.success.retrieved')
  async getAlertsByTeacher(@Params('teacherId') teacherId: string) {
    return this.alertService.getByTeacherId(teacherId);
  }

  @Get('/class/:classId')
  @Validate({ params: alertClassIdParam })
  @McpTool('Get alerts for a class')
  @ResMsg('alerts.success.retrieved')
  async getAlertsByClass(@Params('classId') classId: string) {
    return this.alertService.getByClassId(classId);
  }

  @Get('/subject/:subjectId')
  @Validate({ params: alertSubjectIdParam })
  @McpTool('Get alerts for a subject')
  @ResMsg('alerts.success.retrieved')
  async getAlertsBySubject(@Params('subjectId') subjectId: string) {
    return this.alertService.getBySubjectId(subjectId);
  }

  @Get('/:id')
  @Validate({ params: alertIdParam })
  @McpTool('Get an alert by ID')
  @ResMsg('alerts.success.retrieved')
  async getAlertById(@Params('id') id: string) {
    return this.alertService.getById(id);
  }

  @Post()
  @Validate(createAlertDto)
  @McpTool('Create a new alert')
  @ResMsg('alerts.success.created')
  async create(@Body() alertData: CreateAlertDto) {
    return this.alertService.create(alertData);
  }

  @Put('/:id')
  @Validate({ params: alertIdParam, body: updateAlertDto })
  @McpTool('Update an alert')
  @ResMsg('alerts.success.updated')
  async update(@Params('id') id: string, @Body() updateData: UpdateAlertDto) {
    return this.alertService.update(id, updateData);
  }

  @Put('/:id/status')
  @Validate({ params: alertIdParam, body: updateAlertStatusDto })
  @McpTool('Update alert status (e.g. mark as read)')
  @ResMsg('alerts.success.statusUpdated')
  async updateStatus(@Params('id') id: string, @Body() body: UpdateAlertStatusDto) {
    return this.alertService.updateStatus(id, body.status);
  }

  @Delete('/resolved')
  @McpTool('Delete all resolved alerts')
  @ResMsg('alerts.success.resolvedDeleted')
  async deleteResolved() {
    return this.alertService.deleteResolved();
  }

  @Delete('/:id')
  @Validate({ params: alertIdParam })
  @McpTool('Delete an alert by ID')
  @ResMsg('alerts.success.deleted')
  async delete(@Params('id') id: string) {
    return this.alertService.delete(id);
  }

  @Delete()
  @McpTool('Delete all alerts')
  @ResMsg('alerts.success.allDeleted')
  async deleteAll() {
    return this.alertService.deleteAll();
  }

  @Post('/generate/attendance')
  @McpTool('Generate attendance alerts')
  @ResMsg('alerts.success.attendanceAlertsGenerated')
  async generateAttendanceAlerts() {
    return this.alertService.generateAttendanceAlerts();
  }

  @Post('/generate/academic')
  @McpTool('Generate academic alerts')
  @ResMsg('alerts.success.academicAlertsGenerated')
  async generateAcademicAlerts() {
    return this.alertService.generateAcademicAlerts();
  }

  @Post('/academic')
  @Validate(typedStudentAlertDto)
  @McpTool('Create an academic alert for a student')
  @ResMsg('alerts.success.created')
  async createAcademic(@Body() body: TypedStudentAlertDto) {
    return this.alertService.createAcademicAlert(body.studentId, body.alertType, body.details);
  }

  @Post('/attendance')
  @Validate(typedStudentAlertDto)
  @McpTool('Create an attendance alert for a student')
  @ResMsg('alerts.success.created')
  async createAttendance(@Body() body: TypedStudentAlertDto) {
    return this.alertService.createAttendanceAlert(body.studentId, body.alertType, body.details);
  }

  @Post('/behavioral')
  @Validate(typedStudentAlertDto)
  @McpTool('Create a behavioral alert for a student')
  @ResMsg('alerts.success.created')
  async createBehavioral(@Body() body: TypedStudentAlertDto) {
    return this.alertService.createBehavioralAlert(body.studentId, body.alertType, body.details);
  }

  @Post('/health')
  @Validate(typedStudentAlertDto)
  @McpTool('Create a health alert for a student')
  @ResMsg('alerts.success.created')
  async createHealth(@Body() body: TypedStudentAlertDto) {
    return this.alertService.createHealthAlert(body.studentId, body.alertType, body.details);
  }

  @Post('/announcement')
  @Validate(announcementAlertDto)
  @McpTool('Create an announcement alert')
  @ResMsg('alerts.success.created')
  async createAnnouncement(@Body() body: AnnouncementAlertDto) {
    return this.alertService.createAnnouncementAlert(
      body.title,
      body.message,
      body.targetAudience,
      body.authorId,
      body.classId
    );
  }

  @Post('/reminder')
  @Validate(reminderAlertDto)
  @McpTool('Create a reminder alert')
  @ResMsg('alerts.success.created')
  async createReminder(@Body() body: ReminderAlertDto) {
    return this.alertService.createReminderAlert(
      body.title,
      body.message,
      body.targetAudience,
      body.authorId,
      body.details
    );
  }

  @Post('/emergency')
  @Validate(emergencyAlertDto)
  @McpTool('Create an emergency alert')
  @ResMsg('alerts.success.created')
  async createEmergency(@Body() body: EmergencyAlertDto) {
    return this.alertService.createEmergencyAlert(body.title, body.message, body.details);
  }

  @Post('/system')
  @Validate(systemAlertDto)
  @McpTool('Create a system alert')
  @ResMsg('alerts.success.created')
  async createSystem(@Body() body: SystemAlertDto) {
    return this.alertService.createSystemAlert(body.message, body.priority);
  }
}
