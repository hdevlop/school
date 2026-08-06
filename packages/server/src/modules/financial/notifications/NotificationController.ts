import { Body, Controller, Get, Headers, Post, ResMsg } from '@server/najm';
import { NotificationService, assertCronSecret } from './NotificationService';
import { runNotificationsDto, type RunNotificationsDto } from './NotificationDto';
import { isAdmin } from '@server/auth';

@Controller('/financial-notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post('/cron/overdue')
  @ResMsg('notifications.overdueRun')
  async runOverdue(
    @Body() body: RunNotificationsDto,
    @Headers('x-cron-secret') secret: string,
  ) {
    assertCronSecret(secret);
    return this.notificationService.runOverdueJob(body);
  }

  @Post('/cron/check-due')
  @ResMsg('notifications.checkDueRun')
  async runCheckDue(
    @Body() body: RunNotificationsDto,
    @Headers('x-cron-secret') secret: string,
  ) {
    assertCronSecret(secret);
    return this.notificationService.runCheckDueJob(body);
  }

  @Post('/list-recent')
  @ResMsg('notifications.list')
  async listRecent(@Body() body: { limit?: number } = {}, @Headers('x-cron-secret') secret: string) {
    assertCronSecret(secret);
    return this.notificationService.listRecent(body.limit ?? 50);
  }

  @Get('/recent')
  @isAdmin()
  @ResMsg('notifications.list')
  async listRecentForAdmin() {
    return this.notificationService.listRecent(100);
  }
}
