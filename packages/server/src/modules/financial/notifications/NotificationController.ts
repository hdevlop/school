import { Body, Controller, Get, Headers, Post, ResMsg, Validate } from '../../../najm';
import { NotificationService } from './NotificationService';
import { assertCronSecret } from './NotificationValidator';
import { listRecentNotificationsDto, runNotificationsDto, type RunNotificationsDto } from './NotificationDto';
import { isAdmin } from '../../../auth';
import { Public } from 'najm-guard';

@Controller('/financial-notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post('/cron/overdue')
  @Public()
  @Validate(runNotificationsDto)
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
  @Validate(runNotificationsDto)
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
  @Validate(listRecentNotificationsDto)
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
