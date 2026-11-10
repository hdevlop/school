import { Events, EventService, On, Service, Transaction } from '../../najm';
import { schoolI18n, type SchoolLocale } from '@sms/contracts/locales';
import { I18nService } from 'najm-i18n';
import { getBusinessDateOnly } from '../../shared/businessDate';
import { PersonalNotificationService } from '../notifications/NotificationService';
import { TeacherService } from '../teachers/TeacherService';
import { TeacherRequestRepository } from './TeacherRequestRepository';
import { TeacherRequestValidator } from './TeacherRequestValidator';
import type { CreateTeacherRequestDto } from './TeacherRequestDto';

@Service()
export class TeacherRequestService {
  @Events() private events!: EventService;

  constructor(
    private repository: TeacherRequestRepository,
    private validator: TeacherRequestValidator,
    private teachers: TeacherService,
    private notifications: PersonalNotificationService,
    private i18n: I18nService,
  ) {}

  /** The answer is always the same: it never says whether an address already waits or already teaches here. */
  async create(input: CreateTeacherRequestDto) {
    if (input.website) return { received: true };
    const { website: _website, ...data } = input;
    const row = await this.repository.create({
      ...data,
      specialization: data.specialization || null,
      academicDegrees: data.academicDegrees || null,
    });
    if (row) await this.events.emit('teacherRequest.created', { id: row.id, language: this.i18n.getCurrentLanguage() as SchoolLocale });
    return { received: true };
  }

  @On('teacherRequest.created')
  async notify(input: { id: string; language: SchoolLocale }) {
    await this.notifications.createTeacherRequestNotification({
      id: input.id,
      title: schoolI18n.translate(input.language, 'teacherRequests.notification.title'),
      body: schoolI18n.translate(input.language, 'teacherRequests.notification.body'),
    });
  }

  list() { return this.repository.list(); }

  async reject(id: string) {
    await this.validator.ensureExists(id);
    await this.repository.delete(id);
    return { id };
  }

  /**
   * The usual teacher creation does the work, so its uniqueness checks and its
   * invitation apply. The account waits as pending until the teacher follows the
   * emailed link or signs in with Google under this address, which accepts the
   * invitation. The hire date is the day of approval until the school corrects it.
   */
  @Transaction()
  async approve(id: string) {
    const request = await this.validator.ensureExists(id);
    const teacher = await this.teachers.create({
      name: request.name,
      email: request.email,
      phone: request.phone,
      cin: request.cin,
      address: request.address,
      gender: request.gender ?? undefined,
      specialization: request.specialization ?? undefined,
      yearsOfExperience: request.yearsOfExperience ?? undefined,
      academicDegrees: request.academicDegrees ?? undefined,
      hireDate: getBusinessDateOnly(),
    });
    await this.repository.delete(id);
    return teacher;
  }
}
