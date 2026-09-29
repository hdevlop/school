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
