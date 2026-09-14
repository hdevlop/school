import { Body, Controller, Delete, Get, Headers, Params, Patch, Post, Query, ResMsg, User, Validate } from '@server/najm';
import { isAuth } from '@server/auth';

import { notificationIdParams, notificationListQuery, pushSubscriptionDto, pushUnsubscribeDto, type NotificationListQuery, type PushSubscriptionDto, type PushUnsubscribeDto } from './notificationDto';
import { PersonalNotificationService } from './NotificationService';

@Controller('/notifications')
@isAuth()
export class PersonalNotificationController {
  constructor(private readonly notifications: PersonalNotificationService) {}

  @Get()
  @Validate({ query: notificationListQuery })
  @ResMsg('notifications.list')
  listMine(@User('id') userId: string, @Query() query: NotificationListQuery) { return this.notifications.listMine(userId, query); }

  @Get('/unread-count')
  @ResMsg('notifications.list')
  unreadCount(@User('id') userId: string) { return this.notifications.unreadCount(userId); }

  @Get('/push-config')
  @ResMsg('notifications.list')
  pushConfig() { return this.notifications.pushConfig(); }

  @Post('/push-subscriptions')
  @Validate(pushSubscriptionDto)
  @ResMsg('notifications.list')
  subscribe(@User('id') userId: string, @Body() body: PushSubscriptionDto, @Headers('user-agent') userAgent?: string) {
    return this.notifications.subscribe(userId, body, userAgent);
  }

  @Delete('/push-subscriptions')
  @Validate(pushUnsubscribeDto)
  @ResMsg('notifications.list')
  unsubscribe(@User('id') userId: string, @Body() body: PushUnsubscribeDto) { return this.notifications.unsubscribe(userId, body); }

  @Patch('/read-all')
  @ResMsg('notifications.list')
  readAll(@User('id') userId: string) { return this.notifications.markAllRead(userId); }

  @Patch('/:id/read')
  @Validate({ params: notificationIdParams })
  @ResMsg('notifications.list')
  markRead(@User('id') userId: string, @Params('id') id: string) { return this.notifications.markRead(userId, id); }
}
