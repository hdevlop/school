import { Injectable } from '@server/najm';
import { ParentService } from '../parents/ParentService';
import { FeeService } from '../financial/fees/FeeService';
import { EventService } from '../events/EventService';
import { AlertService } from '../alerts/AlertService';

@Injectable()
export class ParentProfileService {
  constructor(
    private parentService: ParentService,
    private feeService: FeeService,
    private eventService: EventService,
    private alertService: AlertService,
  ) {}

  async getUnreadAlerts(parentId: string) {
    const children = await this.parentService.getChildren(parentId);
    const perChild = await Promise.all(
      (children || []).map(async (child: any) => {
        const alerts = await this.alertService.getByStudentId(child.id).catch(() => []);
        const unread = Array.isArray(alerts)
          ? alerts.filter((a: any) => a.status === 'active')
          : [];
        return { studentId: child.id, studentName: child.name, alerts: unread };
      })
    );
    const totalUnread = perChild.reduce((sum, c) => sum + c.alerts.length, 0);
    return { totalUnread, perChild };
  }

  async getChildren(parentId: string) {
    const children = await this.parentService.getChildren(parentId);
    const childrenWithFees = await Promise.all(
      (children || []).map(async (child: any) => {
        const fees = await this.feeService.getByStudent(child.id).catch(() => null);
        return { ...child, fees };
      })
    );
    return childrenWithFees;
  }

  async getFeesDue(parentId: string) {
    const children = await this.parentService.getChildren(parentId);
    const allFees = await Promise.all(
      (children || []).map(async (child: any) => {
        const feeData = await this.feeService.getByStudent(child.id).catch(() => null);
        return { studentId: child.id, studentName: child.name, fees: feeData };
      })
    );
    return allFees;
  }

  async getUpcomingEvents(parentId: string) {
    const [children, events] = await Promise.all([
      this.parentService.getChildren(parentId),
      this.eventService.getUpcoming().catch(() => []),
    ]);
    const childrenSections = (children || []).map((c: any) => c.sectionId).filter(Boolean);
    const relevantEvents = Array.isArray(events)
      ? events.filter((e: any) => !e.sectionId || childrenSections.includes(e.sectionId) || !e.classId || (children || []).some((c: any) => c.classId === e.classId))
      : [];
    return { children: children || [], events: relevantEvents };
  }
}
