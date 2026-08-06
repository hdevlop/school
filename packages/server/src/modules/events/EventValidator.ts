import { Service, Err, I18n, t } from '@server/najm';
import { EventRepository } from './EventRepository';
import { ClassValidator } from '../classes/ClassValidator';

@Service()
export class EventValidator {
  @I18n('events.errors') private et!: (key: string) => string;

  constructor(
    private eventRepository: EventRepository,
    private classValidator: ClassValidator,
  ) { }

  async ensureExists(id: string) {
    const event = await this.eventRepository.getById(id);
    if (!event) {
      Err(404, this.et('notFound'));
    }
    return event;
  }

  async ensureClassAndSectionValid(classId?: string) {
    if (classId) {
      await this.classValidator.ensureExists(classId);
    }
  }

  async ensureClassesValid(classIds?: string[] | null) {
    if (!classIds?.length) return;

    const uniqueClassIds = [...new Set(classIds)];
    for (const classId of uniqueClassIds) {
      await this.classValidator.ensureExists(classId);
    }
  }

  async ensureCapacityAvailable(eventId: string, additionalParticipants: number = 1) {
    const event = await this.ensureExists(eventId);

    if (!event.capacity) {
      return true;
    }

    const currentCount = await this.eventRepository.getParticipantCount(eventId);
    const newTotal = currentCount + additionalParticipants;

    if (newTotal > event.capacity) {
      Err(409, t('events.errors.capacityFull', {
        capacity: event.capacity,
        current: currentCount
      }));
    }

    return true;
  }

  async ensureRegistrationDeadlineValid(eventId: string) {
    const event = await this.ensureExists(eventId);

    if (!event.registrationRequired || !event.registrationDeadline) {
      return true;
    }

    const today = new Date();
    const deadline = new Date(event.registrationDeadline);

    if (today > deadline) {
      Err(409, this.et('registrationClosed'));
    }

    return true;
  }

  async ensureParticipantRegistrationValid(eventId: string, participantId: string) {
    const exists = await this.eventRepository.checkParticipantExists(eventId, participantId);
    if (exists) {
      Err(409, this.et('alreadyRegistered'));
    }

    await this.ensureCapacityAvailable(eventId);
    await this.ensureRegistrationDeadlineValid(eventId);

    return true;
  }

  async ensureBulkRegistrationValid(eventId: string, participantIds: string[]) {
    await this.ensureCapacityAvailable(eventId, participantIds.length);
    await this.ensureRegistrationDeadlineValid(eventId);

    const alreadyRegistered = [];
    for (const participantId of participantIds) {
      const exists = await this.eventRepository.checkParticipantExists(eventId, participantId);
      if (exists) {
        alreadyRegistered.push(participantId);
      }
    }

    if (alreadyRegistered.length > 0) {
      Err(409, t('events.errors.someAlreadyRegistered', {
        count: alreadyRegistered.length
      }));
    }

    return true;
  }

  async ensureEventStatusAllowed(eventId: string, allowedStatuses: string[]) {
    const event = await this.ensureExists(eventId);

    if (!allowedStatuses.includes(event.status)) {
      Err(409, t('events.errors.invalidStatus', {
        current: event.status,
        allowed: allowedStatuses.join(', ')
      }));
    }

    return true;
  }

  // ========================================
// EVENT_VALIDATIONS
// ========================================

async checkEndDateAfterStart(startDate: Date | string, endDate: Date | string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    Err(400, this.et('endDateBeforeStart'));
  }
  return true;
}

async checkEndTimeAfterStartForSameDay(
  startDate: Date | string,
  endDate: Date | string,
  startTime: string,
  endTime: string
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sameDay = start.toDateString() === end.toDateString();
  
  if (sameDay) {
    // Parse times (assuming HH:mm format)
    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];

    if (endMinutes <= startMinutes) {
      Err(400, this.et('endTimeBeforeStart'));
    }
  }
  return true;
}

async checkRegistrationDeadlineValid(
  registrationDeadline?: Date | string | null,
  startDate?: Date | string
) {
  if (!registrationDeadline || !startDate) {
    return true;
  }

  const registration = new Date(registrationDeadline);
  const start = new Date(startDate);

  if (registration > start) {
    Err(400, this.et('registrationDeadlineAfterStart'));
  }
  return true;
}

async validateEventDates(
  startDate: Date | string,
  endDate: Date | string,
  startTime: string,
  endTime: string,
  registrationDeadline?: Date | string | null
) {
  await this.checkEndDateAfterStart(startDate, endDate);
  await this.checkEndTimeAfterStartForSameDay(startDate, endDate, startTime, endTime);
  await this.checkRegistrationDeadlineValid(registrationDeadline, startDate);
  return true;
}

  async checkExists(id: string) {
    return this.ensureExists(id);
  }

  async validateClassAndSection(classId?: string, sectionId?: string) {
    return this.ensureClassAndSectionValid(classId);
  }

  async validateCapacity(eventId: string, additionalParticipants: number = 1) {
    return this.ensureCapacityAvailable(eventId, additionalParticipants);
  }

  async validateRegistrationDeadline(eventId: string) {
    return this.ensureRegistrationDeadlineValid(eventId);
  }

  async validateParticipantRegistration(eventId: string, participantId: string) {
    return this.ensureParticipantRegistrationValid(eventId, participantId);
  }

  async validateBulkRegistration(eventId: string, participantIds: string[]) {
    return this.ensureBulkRegistrationValid(eventId, participantIds);
  }

  async validateEventStatus(eventId: string, allowedStatuses: string[]) {
    return this.ensureEventStatusAllowed(eventId, allowedStatuses);
  }
}
