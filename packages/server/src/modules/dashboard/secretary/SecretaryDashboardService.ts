import { matchPermission } from 'najm-auth/client';
import type { SecretaryDashboardOverview } from '@sms/contracts/secretary-dashboard';
import { Injectable } from '../../../najm';
import { StudentService } from '../../students/StudentService';
import { ParentService } from '../../parents/ParentService';
import { VisitRequestRepository } from '../../visitRequests/VisitRequestRepository';
import { PersonalNotificationRepository } from '../../notifications/NotificationRepository';

@Injectable()
export class SecretaryDashboardService {
  constructor(
    private students: StudentService,
    private parents: ParentService,
    private visits: VisitRequestRepository,
    private notifications: PersonalNotificationRepository,
  ) {}

  async getOverview(user: { id: string; permissions?: string[] }): Promise<SecretaryDashboardOverview> {
    const can = (permission: string) => matchPermission(user.permissions ?? [], permission);
    const [students, parents, visitRequests, unreadNotifications] = await Promise.all([
      can('read:students') ? this.students.getCount(true) : null,
      can('read:parents') ? this.parents.getCount() : null,
      can('read:visit-requests') ? this.visits.getDashboardSummary() : null,
      this.notifications.unreadCount(user.id),
    ]);
    return {
      students: students?.count ?? null,
      parents: parents?.count ?? null,
      visitRequests,
      unreadNotifications,
    };
  }
}
