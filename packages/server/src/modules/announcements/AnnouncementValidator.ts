import { Service, Err, I18n } from '@server/najm';
import { AnnouncementRepository } from './AnnouncementRepository';
import { ClassValidator } from '../classes/ClassValidator';

@Service()
export class AnnouncementValidator {
  @I18n('announcements.errors') private at!: (key: string) => string;

  constructor(
    private announcementRepository: AnnouncementRepository,
    private classValidator: ClassValidator,
  ) { }


  // ========================================
  // Existence Checks (throw errors)
  // ========================================

  async ensureExists(id: string) {
    const announcementExists = await this.announcementRepository.getById(id);
    if (!announcementExists) {
      Err(404, this.at('notFound'));
    }
    return announcementExists;
  }

  // ========================================
  // Business Logic Validations
  // ========================================

  async ensureTargetAudienceValid(targetAudience: string, classIds?: string[] | null) {
    const targets = [...new Set((classIds || []).filter(Boolean))];

    if (targetAudience === 'all' && targets.length) {
      Err(400, this.at('allAudienceNoClassSection'));
    }

    if (targetAudience === 'class' && !targets.length) {
      Err(400, this.at('classRequired'));
    }

    await Promise.all(targets.map((classId) => this.classValidator.ensureExists(classId)));

    return true;
  }

  async ensurePublishDateValid(publishDate?: string, expiryDate?: string) {
    if (!publishDate && !expiryDate) {
      return true;
    }

    if (publishDate && expiryDate) {
      const publish = new Date(publishDate);
      const expiry = new Date(expiryDate);

      if (expiry <= publish) {
        Err(400, this.at('expiryBeforePublish'));
      }
    }

    return true;
  }

  async ensureCanPublish(id: string) {
    const announcement = await this.ensureExists(id);

    if (announcement.isPublished) {
      Err(409, this.at('alreadyPublished'));
    }

    return true;
  }

  async ensureCanUnpublish(id: string) {
    const announcement = await this.ensureExists(id);

    if (!announcement.isPublished) {
      Err(409, this.at('notPublished'));
    }

    return true;
  }

  async checkExists(id: string) {
    return this.ensureExists(id);
  }

  async validateTargetAudience(targetAudience: string, classIds?: string[] | null) {
    return this.ensureTargetAudienceValid(targetAudience, classIds);
  }

  async validatePublishDate(publishDate?: string, expiryDate?: string) {
    return this.ensurePublishDateValid(publishDate, expiryDate);
  }

  async checkCanPublish(id: string) {
    return this.ensureCanPublish(id);
  }

  async checkCanUnpublish(id: string) {
    return this.ensureCanUnpublish(id);
  }
}
