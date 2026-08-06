import { Err, Service, Transaction } from '@server/najm';
import { NotificationRepository, checkCronSecret } from './NotificationRepository';
import { AlertService } from '../../alerts/AlertService';
import { FinancialAuditService } from '../auditLog/FinancialAuditService';
import { formatDateOnly } from '../utils/dateOnly';
import { getBusinessDate } from '@server/shared/businessDate';

export const CHECK_DUE_WINDOW_DAYS = 7;

@Service()
export class NotificationService {
  constructor(
    private notificationRepository: NotificationRepository,
    private alertService: AlertService,
    private auditService: FinancialAuditService,
  ) { }

  @Transaction()
  private async deliverAlert(input: {
    kind: 'installment_overdue' | 'check_due';
    businessDate: string;
    studentId: string;
    title: string;
    message: string;
    priority: 'high' | 'medium';
    payload: any;
    actorId?: string | null;
    auditAction: string;
    entityId: string;
  }) {
    const claim = await this.notificationRepository.tryClaimDelivery({
      kind: input.kind,
      studentId: input.studentId,
      businessDate: input.businessDate,
      payload: input.payload,
    });
    if (!claim.claimed) return { claimed: false as const };

    const alert = await this.alertService.create({
      type: 'reminder',
      priority: input.priority,
      title: input.title,
      message: input.message,
      studentId: input.studentId,
      status: 'active',
    } as any);

    await this.auditService.record({
      entityType: 'notification',
      entityId: input.entityId,
      action: input.auditAction,
      actorId: input.actorId ?? null,
      before: null,
      after: { businessDate: input.businessDate, studentId: input.studentId },
      metadata: input.payload,
    });

    return { claimed: true as const, alertId: (alert as any)?.id };
  }

  async runOverdueJob(input: { businessDate?: string; dryRun?: boolean; actorId?: string }) {
    const businessDate = input.businessDate ?? formatDateOnly(getBusinessDate()) as string;
    const dryRun = input.dryRun ?? false;
    const students = await this.notificationRepository.getStudentsWithOverdueInstallments(businessDate);

    const results: Array<{
      studentId: string;
      status: 'claimed' | 'already-delivered' | 'skipped' | 'failed';
      alertId?: string;
      payload: any;
      error?: string;
    }> = [];

    for (const student of students) {
      const payload = {
        kind: 'installment_overdue',
        businessDate,
        studentId: student.studentId,
        installmentCount: student.installmentCount,
        totalUnpaid: student.totalUnpaid,
        oldestDueDate: student.oldestDueDate,
      };

      if (dryRun) {
        results.push({ studentId: student.studentId, status: 'skipped', payload });
        continue;
      }

      let delivery;
      try {
        delivery = await this.deliverAlert({
          kind: 'installment_overdue',
          studentId: student.studentId,
          businessDate,
          title: `Overdue installments for ${student.studentName}`,
          message: `${student.installmentCount} overdue installment(s); total ${student.totalUnpaid.toFixed(2)} MAD`,
          priority: 'high',
          payload,
          actorId: input.actorId,
          auditAction: 'notification.overdue.created',
          entityId: `${businessDate}:${student.studentId}`,
        });
      } catch (error) {
        results.push({
          studentId: student.studentId,
          status: 'failed',
          payload,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      if (!delivery.claimed) {
        results.push({ studentId: student.studentId, status: 'already-delivered', payload });
        continue;
      }
      results.push({ studentId: student.studentId, status: 'claimed', alertId: delivery.alertId, payload });
    }

    return { businessDate, dryRun, processed: students.length, results };
  }

  async runCheckDueJob(input: { businessDate?: string; dryRun?: boolean; actorId?: string; daysAhead?: number }) {
    const businessDate = input.businessDate ?? formatDateOnly(getBusinessDate()) as string;
    const dryRun = input.dryRun ?? false;
    const daysAhead = input.daysAhead ?? CHECK_DUE_WINDOW_DAYS;
    const checks = await this.notificationRepository.getStudentsWithChecksDueInWindow(businessDate, daysAhead);
    const groups = new Map<string, typeof checks>();
    for (const check of checks) {
      const group = groups.get(check.studentId) ?? [];
      group.push(check);
      groups.set(check.studentId, group);
    }

    const results: Array<{
      studentId: string;
      paymentId: string;
      status: 'claimed' | 'already-delivered' | 'skipped' | 'failed';
      alertId?: string;
      payload: any;
      error?: string;
    }> = [];

    for (const studentChecks of groups.values()) {
      const check = studentChecks[0];
      const totalAmount = studentChecks.reduce((sum, item) => sum + item.amount, 0);
      const payload = {
        kind: 'check_due',
        businessDate,
        studentId: check.studentId,
        checks: studentChecks.map((item) => ({
          paymentId: item.paymentId,
          checkNumber: item.checkNumber,
          checkDueDate: item.checkDueDate,
          amount: item.amount,
          status: item.status,
        })),
        totalAmount,
      };

      if (dryRun) {
        results.push({
          studentId: check.studentId,
          paymentId: check.paymentId,
          status: 'skipped',
          payload,
        });
        continue;
      }

      let delivery;
      try {
        delivery = await this.deliverAlert({
          kind: 'check_due',
          studentId: check.studentId,
          businessDate,
          title: `${studentChecks.length} check(s) due soon for ${check.studentName}`,
          message: `${totalAmount.toFixed(2)} MAD across ${studentChecks.length} check(s) is due in the next ${daysAhead} days`,
          priority: 'medium',
          payload,
          actorId: input.actorId,
          auditAction: 'notification.checkDue.created',
          entityId: `${businessDate}:${check.studentId}`,
        });
      } catch (error) {
        results.push({
          studentId: check.studentId,
          paymentId: check.paymentId,
          status: 'failed',
          payload,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      if (!delivery.claimed) {
        results.push({
          studentId: check.studentId,
          paymentId: check.paymentId,
          status: 'already-delivered',
          payload,
        });
        continue;
      }

      results.push({
        studentId: check.studentId,
        paymentId: check.paymentId,
        status: 'claimed',
        alertId: delivery.alertId,
        payload,
      });
    }

    return { businessDate, dryRun, daysAhead, processed: groups.size, results };
  }

  async listRecent(limit = 50) {
    return this.notificationRepository.listRecent(limit);
  }
}

export function assertCronSecret(provided: string | null | undefined) {
  if (!checkCronSecret(provided)) {
    Err(401, 'Invalid or missing FINANCIAL_CRON_SECRET');
  }
}
