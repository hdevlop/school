import { Body, Controller, Get, Headers, Post, ResMsg } from '../../../najm';
import { NotificationService } from './NotificationService';
import { assertCronSecret } from './NotificationValidator';
import { type RunNotificationsDto } from './NotificationDto';
import { isAdmin } from '../../../auth';
import { Public } from 'najm-guard';

@Controller('/financial-notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post('/cron/overdue')
  @Public()
  @ResMsg('notifications.overdueRun')
  async runOverdue(
    @Body() body: RunNotificationsDto,
    @Headers('x-cron-secret') secret: string,
  ) {
    assertCronSecret(secret);
    return this.notificationService.runOverdueJob(body);
  }

  @Post('/cron/check-due')
  @Public()
  @ResMsg('notifications.checkDueRun')
  async runCheckDue(
    @Body() body: RunNotificationsDto,
    @Headers('x-cron-secret') secret: string,
  ) {
    assertCronSecret(secret);
    return this.notificationService.runCheckDueJob(body);
  }

  @Post('/list-recent')
  @Public()
  @ResMsg('notifications.list')
  async listRecent(@Body() body: { limit?: number }, @Headers('x-cron-secret') secret: string) {
    assertCronSecret(secret);
    return this.notificationService.listRecent(body?.limit ?? 50);
  }

  @Get('/recent')
  @isAdmin()
  @ResMsg('notifications.list')
  async listRecentForAdmin() {
    return this.notificationService.listRecent(100);
  }
}
