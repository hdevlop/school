import { Injectable } from '../../../najm';
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
      this.alertService.getActiveAlerts(),
      this.alertService.getCriticalAlerts(),
      this.announcementService.getPublished(),
    ]);

    return {
      activeEventsToday: (todayEvents as any[]).length,
      activeAlertsCount: activeAlerts.length,
      criticalAlertsCount: criticalAlerts.length,
      activeAnnouncementsCount: activeAnnouncements.length,
    };
  }
}
