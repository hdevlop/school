import { Service } from '@server/najm';
import { EventRepository } from './EventRepository';
import { EventValidator } from './EventValidator';
import type {
  CreateEventDto,
  CreateEventParticipantDto,
  UpdateEventDto,
  UpdateEventParticipantDto,
} from './EventDto';

@Service()
export class EventService {

  constructor(
    private eventRepository: EventRepository,
    private eventValidator: EventValidator,
  ) { }

  // ========== EVENT OPERATIONS ==========//

  private normalizeEventTargets<T extends CreateEventDto | UpdateEventDto>(data: T, force = false): T {
    const hasTargetChange = force || 'classIds' in data || 'classId' in data || 'sectionId' in data;
    if (!hasTargetChange) return data;

    const classIds = data.classIds?.filter(Boolean) ?? [];
    const uniqueClassIds = [...new Set(classIds)];

    return {
      ...data,
      classIds: uniqueClassIds.length > 0 ? uniqueClassIds : null,
      classId: uniqueClassIds[0] ?? data.classId ?? null,
      sectionId: null,
    } as T;
  }

  async getAll() {
    return await this.eventRepository.getAll();
  }

  async getById(id: string) {
    return await this.eventValidator.ensureExists(id);
  }

  async getByStatus(status: string) {
    return await this.eventRepository.getByStatus(status);
  }

  async getByType(type: string) {
    return await this.eventRepository.getByType(type);
  }

  async getByOrganizer(organizerId: string) {
    return await this.eventRepository.getByOrganizer(organizerId);
  }

  async getByClass(classId: string) {
    return await this.eventRepository.getByClass(classId);
  }

  async getBySection(sectionId: string) {
    return await this.eventRepository.getBySection(sectionId);
  }

  async getByVisibility(visibility: string) {
    return await this.eventRepository.getByVisibility(visibility);
  }

  async getUpcoming() {
    return await this.eventRepository.getUpcoming();
  }

  async getPast() {
    return await this.eventRepository.getPast();
  }

  async getByDateRange(startDate: string, endDate: string) {
    await this.eventValidator.checkEndDateAfterStart(startDate, endDate);
    return await this.eventRepository.getByDateRange(startDate, endDate);
  }

  async getActiveEvents() {
    return await this.eventRepository.getActiveEvents();
  }

  async getTodayEvents() {
    return await this.eventRepository.getTodayEvents();
  }

  async create(data: CreateEventDto) {
    const normalizedData = this.normalizeEventTargets(data, true);
    await this.eventValidator.ensureClassesValid(normalizedData.classIds);
    await this.eventValidator.validateEventDates(normalizedData.startDate, normalizedData.endDate, normalizedData.startTime, normalizedData.endTime, normalizedData.registrationDeadline ?? undefined);

    const eventData = {
      ...normalizedData,
      status: normalizedData.status || 'scheduled',
    };

    return await this.eventRepository.create(eventData);
  }

  async update(id: string, data: UpdateEventDto) {
    const current = await this.eventValidator.ensureExists(id);
    const normalizedData = this.normalizeEventTargets(data);

    if (normalizedData.classIds?.length || normalizedData.classId) {
      const classIdsToValidate = normalizedData.classIds ?? (normalizedData.classId ? [normalizedData.classId] : []);
      await this.eventValidator.ensureClassesValid(classIdsToValidate);
    }

    const startDate = normalizedData.startDate ?? current.startDate;
    const endDate = normalizedData.endDate ?? current.endDate;
    const startTime = normalizedData.startTime ?? current.startTime;
    const endTime = normalizedData.endTime ?? current.endTime;
    const registrationDeadline = normalizedData.registrationDeadline ?? current.registrationDeadline;

    if (startDate && endDate && startTime && endTime) {
      await this.eventValidator.validateEventDates(startDate, endDate, startTime, endTime, registrationDeadline ?? undefined);
    }

    return await this.eventRepository.update(id, normalizedData);
  }

  async delete(id: string) {
    await this.eventValidator.ensureExists(id);
    return await this.eventRepository.delete(id);
  }

  async deleteAll() {
    return await this.eventRepository.deleteAll();
  }

  // ========== EVENT STATUS MANAGEMENT ==========//

  async startEvent(id: string) {
    await this.eventValidator.ensureEventStatusAllowed(id, ['scheduled']);

    return await this.eventRepository.update(id, {
      status: 'ongoing',
    });
  }

  async completeEvent(id: string) {
    await this.eventValidator.ensureEventStatusAllowed(id, ['ongoing', 'scheduled']);

    return await this.eventRepository.update(id, {
      status: 'completed',
    });
  }

  async cancelEvent(id: string) {
    await this.eventValidator.ensureEventStatusAllowed(id, ['scheduled', 'ongoing']);

    return await this.eventRepository.update(id, {
      status: 'cancelled',
    });
  }

  async postponeEvent(id: string, newStartDate: string, newEndDate: string) {
    const current = await this.eventValidator.ensureExists(id);
    await this.eventValidator.validateEventDates(newStartDate, newEndDate, current.startTime, current.endTime, current.registrationDeadline ?? undefined);

    return await this.eventRepository.update(id, {
      startDate: newStartDate,
      endDate: newEndDate,
      status: 'postponed',
    });
  }

  // ========== PARTICIPANT OPERATIONS ==========//

  async getParticipants(eventId: string) {
    await this.eventValidator.ensureExists(eventId);
    return await this.eventRepository.getParticipants(eventId);
  }

  async getParticipantsByType(eventId: string, participantType: string) {
    await this.eventValidator.ensureExists(eventId);
    return await this.eventRepository.getParticipantsByType(eventId, participantType);
  }

  async getEventsByParticipant(participantId: string) {
    return await this.eventRepository.getEventsByParticipant(participantId);
  }

  async addParticipant(data: CreateEventParticipantDto) {
    await this.eventValidator.ensureParticipantRegistrationValid(
      data.eventId,
      data.participantId
    );

    return await this.eventRepository.addParticipant(data);
  }

  async updateParticipant(id: string, data: UpdateEventParticipantDto) {
    return await this.eventRepository.updateParticipant(id, data);
  }

  async removeParticipant(id: string) {
    return await this.eventRepository.removeParticipant(id);
  }

  async markAttendance(id: string, status: string) {
    return await this.eventRepository.updateParticipant(id, {
      attendanceStatus: status,
    });
  }

  // ========== ANALYTICS ==========//

  async getEventAnalytics() {
    return await this.eventRepository.getEventAnalytics();
  }

  async getEventsByTypeCount() {
    return await this.eventRepository.getEventsByTypeCount();
  }

  async getParticipantCount(eventId: string) {
    await this.eventValidator.ensureExists(eventId);
    return await this.eventRepository.getParticipantCount(eventId);
  }
}
