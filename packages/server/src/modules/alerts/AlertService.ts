import { Service } from '../../najm';
import { AlertRepository } from './AlertRepository';
import { AlertValidator, type AlertActor } from './AlertValidator';
import { createAlertDto, type CreateAlertDto, type UpdateAlertDto, type UpdateAlertStatusDto } from './AlertDto';

@Service()
export class AlertService {
  constructor(
    private alertRepository: AlertRepository,
    private alertValidator: AlertValidator,
  ) { }

  async getAll() {
    return await this.alertRepository.getAll();
  }

  async getById(id: string) {
    return await this.alertValidator.ensureAlertExists(id);
  }

  async getByType(type: CreateAlertDto['type']) {

    return await this.alertRepository.getByType(type);
  }

  async getByStatus(status: CreateAlertDto['status']) {
    return await this.alertRepository.getByStatus(status);
  }

  async getByPriority(priority: CreateAlertDto['priority']) {
    return await this.alertRepository.getByPriority(priority);
  }

  async getByStudentId(studentId: string) {
    await this.alertValidator.ensureStudentExists(studentId);
    return await this.alertRepository.getByStudentId(studentId);
  }

  async getByTeacherId(teacherId: string) {
    await this.alertValidator.ensureTeacherExists(teacherId);
    return await this.alertRepository.getByTeacherId(teacherId);
  }

  async getByClassId(classId: string) {
    await this.alertValidator.ensureClassExists(classId);
    return await this.alertRepository.getByClassId(classId);
  }

  async getBySubjectId(subjectId: string) {
    await this.alertValidator.ensureSubjectExists(subjectId);
    return await this.alertRepository.getBySubjectId(subjectId);
  }

  async getActiveAlerts() {
    return await this.alertRepository.getActiveAlerts();
  }

  async getCriticalAlerts() {
    return await this.alertRepository.getCriticalAlerts();
  }

  async getRecentAlertsByHours(hours: number = 24) {
    return await this.alertRepository.getRecentAlertsByHours(hours);
  }

  async getRecentAlerts(limit: number = 10) {
    return await this.alertRepository.getRecentAlerts(limit);
  }

  async getCount() {
    return await this.alertRepository.getCount();
  }

  async getStatusCounts() {
    return await this.alertRepository.getStatusCounts();
  }

  async getPriorityCounts() {
    return await this.alertRepository.getPriorityCounts();
  }

  async getTypeCounts() {
    return await this.alertRepository.getTypeCounts();
  }

  async create(data: CreateAlertDto) {
    const academicYearId = await this.alertValidator.ensureYearScope(data);
    await this.alertValidator.ensureNoDuplicateActiveAlertInScope(
      data.type,
      academicYearId,
      data.studentId,
      data.teacherId,
      data.classId,
      data.subjectId,
    );

    const alertData = {
      ...data,
      status: 'active',
      academicYearId,
    };

    const newAlert = await this.alertRepository.create(alertData);
    return await this.getById(newAlert.id);
  }

  /** Trusted financial job: the charged fee, not an HTTP selection, owns this reminder. */
  async createFromFeeSource(feeId: string, input: {
    studentId: string; title: string; message: string; priority: 'high' | 'medium';
  }) {
    const year = await this.alertValidator.ensureFeeSource(feeId, input.studentId);
    const data = createAlertDto.parse({ ...input, type: 'reminder' });
    await this.alertValidator.ensureNoDuplicateActiveAlertInScope('reminder', year.id, input.studentId);
    return this.alertRepository.createFromSourceYear({ ...data, status: 'active' }, year.id);
  }

  async update(id: string, data: UpdateAlertDto, actor: AlertActor) {
    this.alertValidator.ensureCanEdit(actor);
    const existing = await this.alertValidator.ensureAlertExists(id);
    const changesTarget = (['type', 'studentId', 'teacherId', 'classId', 'subjectId'] as const)
      .some((field) => data[field] !== undefined && data[field] !== existing![field]);
    if (changesTarget) {
      const merged = {
        type: data.type ?? existing!.type,
        studentId: data.studentId === undefined ? existing!.studentId : data.studentId,
        teacherId: data.teacherId === undefined ? existing!.teacherId : data.teacherId,
        classId: data.classId === undefined ? existing!.classId : data.classId,
        subjectId: data.subjectId === undefined ? existing!.subjectId : data.subjectId,
      } as CreateAlertDto;
      const nextYearId = await this.alertValidator.ensureYearScope(merged);
      await this.alertValidator.ensureScopeUnchanged(existing!.academicYearId, nextYearId);
    }
    return await this.alertRepository.update(id, data);
  }

  async updateStatus(id: string, status: UpdateAlertStatusDto['status'], actor: AlertActor) {
    const alert = await this.alertValidator.ensureAlertExists(id);
    this.alertValidator.ensureCanHandle(alert, status, actor);
    return await this.alertRepository.updateStatus(id, status);
  }

  async delete(id: string) {
    await this.alertValidator.ensureAlertExists(id);
    return await this.alertRepository.delete(id);
  }

  async deleteAll() {
    return await this.alertRepository.deleteAll();
  }

  async deleteResolved() {
    return await this.alertRepository.deleteResolved();
  }

  async createAcademicAlert(studentId: string, alertType: string, details?: Record<string, any>) {
    let title, message, priority;

    switch (alertType) {
      case 'low_grade':
        priority = details?.grade < 50 ? 'critical' : details?.grade < 60 ? 'high' : 'medium';
        title = 'Low Academic Performance';
        message = `Student has received a low grade of ${details?.grade || 'unknown'}% in ${details?.subject || 'a subject'}. Intervention may be required.`;
        break;
      case 'missing_assignment':
        priority = details?.daysOverdue > 7 ? 'high' : 'medium';
        title = 'Missing Assignment';
        message = `Student has a missing assignment in ${details?.subject || 'a subject'}${details?.daysOverdue ? ` (${details.daysOverdue} days overdue)` : ''}.`;
        break;
      case 'exam_failure':
        priority = 'critical';
        title = 'Exam Failure';
        message = `Student failed an exam in ${details?.subject || 'a subject'} with ${details?.grade || 'unknown'}%. Immediate attention required.`;
        break;
      default:
        priority = 'medium';
        title = 'Academic Alert';
        message = details?.message || 'Academic performance issue detected.';
    }

    const alertData = {
      type: 'academic',
      title,
      message,
      priority,
      studentId,
      classId: details?.classId,
      subjectId: details?.subjectId
    };

    return await this.create(alertData as CreateAlertDto);
  }

  async createAttendanceAlert(studentId: string, alertType: string, details?: Record<string, any>) {
    let title, message, priority;

    switch (alertType) {
      case 'chronic_absence':
        priority = details?.attendanceRate < 50 ? 'critical' : details?.attendanceRate < 70 ? 'high' : 'medium';
        title = 'Chronic Absence';
        message = `Student attendance rate is ${details?.attendanceRate || 'unknown'}%. Below required threshold.`;
        break;
      case 'consecutive_absence':
        priority = details?.days > 5 ? 'critical' : details?.days > 3 ? 'high' : 'medium';
        title = 'Consecutive Absences';
        message = `Student has been absent for ${details?.days || 'multiple'} consecutive days.`;
        break;
      case 'tardiness':
        priority = 'medium';
        title = 'Frequent Tardiness';
        message = `Student has been late ${details?.count || 'multiple'} times this week.`;
        break;
      default:
        priority = 'medium';
        title = 'Attendance Alert';
        message = details?.message || 'Attendance issue detected.';
    }

    const alertData = {
      type: 'attendance',
      title,
      message,
      priority,
      studentId,
      classId: details?.classId
    };

    return await this.create(alertData as CreateAlertDto);
  }

  async createBehavioralAlert(studentId: string, alertType: string, details?: Record<string, any>) {
    let title, message, priority;

    switch (alertType) {
      case 'disciplinary_action':
        priority = 'high';
        title = 'Disciplinary Action Required';
        message = `Student behavior requires disciplinary intervention: ${details?.reason || 'behavioral issue'}.`;
        break;
      case 'classroom_disruption':
        priority = 'medium';
        title = 'Classroom Disruption';
        message = `Student has been disruptive in ${details?.subject || 'class'}. Teacher intervention noted.`;
        break;
      case 'positive_behavior':
        priority = 'low';
        title = 'Positive Behavior Recognition';
        message = `Student demonstrated exceptional behavior: ${details?.reason || 'positive achievement'}.`;
        break;
      default:
        priority = 'medium';
        title = 'Behavioral Alert';
        message = details?.message || 'Behavioral concern detected.';
    }

    const alertData = {
      type: 'behavioral',
      title,
      message,
      priority,
      studentId,
      teacherId: details?.teacherId,
      classId: details?.classId
    };

    return await this.create(alertData as CreateAlertDto);
  }

  async createHealthAlert(studentId: string, alertType: string, details?: Record<string, any>) {
    let title, message, priority;

    switch (alertType) {
      case 'medical_emergency':
        priority = 'critical';
        title = 'Medical Emergency';
        message = `Medical emergency for student: ${details?.condition || 'immediate attention required'}.`;
        break;
      case 'medication_reminder':
        priority = 'high';
        title = 'Medication Reminder';
        message = `Student requires medication administration: ${details?.medication || 'as prescribed'}.`;
        break;
      case 'health_concern':
        priority = 'medium';
        title = 'Health Concern';
        message = `Health concern noted for student: ${details?.concern || 'requires monitoring'}.`;
        break;
      default:
        priority = 'medium';
        title = 'Health Alert';
        message = details?.message || 'Health-related issue detected.';
    }

    const alertData = {
      type: 'health',
      title,
      message,
      priority,
      studentId
    };

    return await this.create(alertData as CreateAlertDto);
  }

  async createSystemAlert(message: string, priority: CreateAlertDto['priority'] = 'medium') {
    const alertData = {
      type: 'system',
      title: 'System Alert',
      message,
      priority
    };

    return await this.create(alertData as CreateAlertDto);
  }

  async createAnnouncementAlert(title: string, message: string, targetAudience: string, authorId: string, classId?: string) {
    const alertData = {
      type: 'announcement',
      title: `Announcement: ${title}`,
      message,
      priority: 'medium',
      targetAudience,
      authorId,
      classId
    };

    return await this.create(alertData as CreateAlertDto);
  }

  async createReminderAlert(title: string, message: string, targetAudience: string, authorId: string, details?: Record<string, any>) {
    const alertData = {
      type: 'reminder',
      title: `Reminder: ${title}`,
      message,
      priority: details?.priority || 'low',
      targetAudience,
      authorId,
      studentId: details?.studentId,
      teacherId: details?.teacherId,
      classId: details?.classId
    };

    return await this.create(alertData as CreateAlertDto);
  }

  async createEmergencyAlert(title: string, message: string, details?: Record<string, any>) {
    const alertData = {
      type: 'emergency',
      title: `EMERGENCY: ${title}`,
      message,
      priority: 'critical',
      targetAudience: 'all',
      authorId: details?.authorId,
      studentId: details?.studentId,
      classId: details?.classId
    };

    return await this.create(alertData as CreateAlertDto);
  }

  async generateAttendanceAlerts() {
    // This would integrate with attendance tracking to auto-generate alerts
    // For now, returning a placeholder structure
    return {
      chronicAbsenceAlerts: 0,
      tardynessAlerts: 0,
      totalCreated: 0,
      alerts: []
    };
  }

  async generateAcademicAlerts() {
    // This would integrate with grading system to auto-generate alerts
    // For now, returning a placeholder structure
    return {
      lowGradeAlerts: 0,
      missingAssignmentAlerts: 0,
      examFailureAlerts: 0,
      totalCreated: 0,
      alerts: []
    };
  }

  async getDashboardSummary() {
    const [active, critical, recent, statusCounts, typeCounts] = await Promise.all([
      this.getActiveAlerts(),
      this.getCriticalAlerts(),
      this.getRecentAlertsByHours(24),
      this.getStatusCounts(),
      this.getTypeCounts()
    ]);

    return {
      activeCount: active.length,
      criticalCount: critical.length,
      recentCount: recent.length,
      statusBreakdown: statusCounts,
      typeBreakdown: typeCounts,
      criticalAlerts: critical.slice(0, 5), 
      recentAlerts: recent.slice(0, 10) 
    };
  }

  async seedDemoAlerts(alertsData: CreateAlertDto[]) {
    const createdAlerts = [];
    for (const alert of alertsData) {
      try {
        const createdAlert = await this.create(alert);
        createdAlerts.push(createdAlert);
      } catch {
        continue;
      }
    }

    return createdAlerts;
  }
}
