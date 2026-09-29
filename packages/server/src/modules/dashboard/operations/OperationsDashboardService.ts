import { Injectable } from '../../../najm';
import { EventService } from '../../events/EventService';
import { AlertService } from '../../alerts/AlertService';
import { AnnouncementService } from '../../announcements/AnnouncementService';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { holdsDay } from '../../academicYears/academicRecordYear';
import { getBusinessDateOnly } from '../../../shared/businessDate';

@Injectable()
export class OperationsDashboardService {
  @Year() private readonly year!: ResolvedAcademicYear;

  constructor(
    private eventService: EventService,
    private alertService: AlertService,
    private announcementService: AnnouncementService,
  ) {}

  // The selected year's alerts and announcements the reader may see. Today's
  // events belong only to the year that holds today; any other year reports
  // none rather than a zero under its name.
  async getKpis() {
    const holdsToday = holdsDay(this.year, getBusinessDateOnly());
    const [todayEvents, activeAlerts, criticalAlerts, activeAnnouncements] = await Promise.all([
      holdsToday ? this.eventService.getTodayEvents() : null,
      this.alertService.getActiveAlerts(),
      this.alertService.getCriticalAlerts(),
      this.announcementService.getPublished(),
    ]);

    return {
      activeEventsToday: todayEvents ? todayEvents.length : null,
      activeAlertsCount: activeAlerts.length,
      criticalAlertsCount: criticalAlerts.length,
      activeAnnouncementsCount: activeAnnouncements.length,
    };
  }
}
