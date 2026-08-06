import { Injectable } from '@server/najm';
import { EventService } from '../../events/EventService';
import { AlertService } from '../../alerts/AlertService';
import { AnnouncementService } from '../../announcements/AnnouncementService';

@Injectable()
export class OperationsDashboardService {
  constructor(
    private eventService: EventService,
    private alertService: AlertService,
    private announcementService: AnnouncementService,
  ) {}

  async getKpis() {
    const [todayEvents, activeAlerts, criticalAlerts, activeAnnouncements] = await Promise.all([
      this.eventService.getTodayEvents().catch(() => []),
      this.alertService.getActiveAlerts().catch(() => []),
      this.alertService.getCriticalAlerts().catch(() => []),
      this.announcementService.getPublished().catch(() => []),
    ]);

    return {
      activeEventsToday: (todayEvents as any[]).length,
      activeAlertsCount: (activeAlerts as any[]).length,
      criticalAlertsCount: (criticalAlerts as any[]).length,
      activeAnnouncementsCount: (activeAnnouncements as any[]).length,
    };
  }
}
