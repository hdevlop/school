import { Injectable } from '../../najm';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
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

  // Each child's active alerts in the request's year that the reader may see.
  async getUnreadAlerts(parentId: string) {
    const children = await this.parentService.getLinkedChildren(parentId);
    const perChild = await Promise.all(
      (children || []).map(async (child: any) => {
        const alerts = await this.alertService.getByStudentId(child.id);
        const unread = alerts.filter((alert) => alert.status === 'active');
        return { studentId: child.id, studentName: child.name, alerts: unread };
      })
    );
    const totalUnread = perChild.reduce((sum, c) => sum + c.alerts.length, 0);
    return { totalUnread, perChild };
  }

  // Each child's class and fees in the year.
  async getChildren(parentId: string, year: ResolvedAcademicYear) {
    const children = await this.parentService.getChildren(parentId, year);
    const childrenWithFees = await Promise.all(
      (children || []).map(async (child: any) => {
        const fees = await this.feeService.getByStudent(child.id).catch(() => null);
        return { ...child, fees };
      })
    );
    return childrenWithFees;
  }

  // Cross-year debt discovery: every year's fees of each child linked now.
  async getFeesDue(parentId: string) {
    const children = await this.parentService.getLinkedChildren(parentId);
    const allFees = await Promise.all(
      (children || []).map(async (child: any) => {
        const feeData = await this.feeService.getByStudentAllYears(child.id).catch(() => null);
        return { studentId: child.id, studentName: child.name, fees: feeData };
      })
    );
    return allFees;
  }

  async getUpcomingEvents(parentId: string) {
    const [children, events] = await Promise.all([
      this.parentService.getLinkedChildren(parentId),
      this.eventService.getUpcoming().catch(() => []),
    ]);
    const childrenSections = (children || []).map((c: any) => c.sectionId).filter(Boolean);
    const relevantEvents = Array.isArray(events)
      ? events.filter((e: any) => !e.sectionId || childrenSections.includes(e.sectionId) || !e.classId || (children || []).some((c: any) => c.classId === e.classId))
      : [];
    return { children: children || [], events: relevantEvents };
  }
}
