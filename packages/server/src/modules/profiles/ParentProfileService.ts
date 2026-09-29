import { Injectable } from '../../najm';
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
      children.map(async (child) => {
        const alerts = await this.alertService.getByStudentId(child.id);
        const unread = alerts.filter((alert) => alert.status === 'active');
        return { studentId: child.id, studentName: child.name, alerts: unread };
      })
    );
    const totalUnread = perChild.reduce((sum, c) => sum + c.alerts.length, 0);
    return { totalUnread, perChild };
  }

  // Each child's class and fees in the request's year; no fees that year is null.
  async getChildren(parentId: string) {
    const children = await this.parentService.getChildren(parentId);
    return Promise.all(children.map(async (child) => ({
      ...child,
      fees: await this.feeService.getByStudent(child.id),
    })));
  }

  // Cross-year debt discovery: every year's fees of each child linked now.
  async getFeesDue(parentId: string) {
    const children = await this.parentService.getLinkedChildren(parentId);
    return Promise.all(children.map(async (child) => ({
      studentId: child.id,
      studentName: child.name,
      fees: await this.feeService.getByStudentAllYears(child.id),
    })));
  }

  // The request's upcoming events that this parent sees, by the events' own
  // parent rule: their audience, and their children's classes and sections
  // on each event's day. The reader's own view limits them too.
  async getUpcomingEvents(parentId: string) {
    const parent = await this.parentService.getById(parentId);
    const [children, events] = await Promise.all([
      this.parentService.getLinkedChildren(parentId),
      this.eventService.getUpcomingForParent(parent.userId),
    ]);
    return { children, events };
  }
}
