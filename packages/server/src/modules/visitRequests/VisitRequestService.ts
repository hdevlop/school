import { Events, EventService, On, Service, Transaction } from '../../najm';
import { schoolI18n, type SchoolLocale } from '@sms/contracts/locales';
import type { VisitRequestStatus } from '@sms/contracts';
import { VisitRequestRepository } from './VisitRequestRepository';
import { VisitRequestValidator } from './VisitRequestValidator';
import { PersonalNotificationService } from '../notifications/NotificationService';
import { I18nService } from 'najm-i18n';
import type { CreateVisitRequestDto, UpdateVisitRequestDto } from './VisitRequestDto';

@Service()
export class VisitRequestService {
  @Events() private events!: EventService;
  constructor(private repository: VisitRequestRepository, private validator: VisitRequestValidator, private notifications: PersonalNotificationService, private i18n: I18nService) {}
  async create(input: CreateVisitRequestDto) {
    if (input.website) return { received: true };
    const { website: _website, ...data } = input;
    const language = this.i18n.getCurrentLanguage() as SchoolLocale;
    await this.validator.ensureActiveCycle(data.cycleId);
    const row = await this.repository.create({ ...data, email: data.email || null, language });
    await this.events.emit('visitRequest.created', { id: row.id, language });
    return { received: true };
  }
  @On('visitRequest.created')
  async notify(input: { id: string; language: SchoolLocale }) {
    await this.notifications.createVisitRequestNotification({ id: input.id,
      title: schoolI18n.translate(input.language, 'visitRequests.notification.title'),
      body: schoolI18n.translate(input.language, 'visitRequests.notification.body'),
    });
  }
  list(status?: VisitRequestStatus) { return this.repository.list(status); }
  @Transaction()
  async update(id: string, input: UpdateVisitRequestDto, actorId: string) { await this.validator.ensureExists(id); return this.repository.update(id, { ...input, handledBy: actorId }); }
}
