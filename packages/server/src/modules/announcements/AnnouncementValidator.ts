import { Service, Err, I18n } from '../../najm';
import { SCHOOL_WIDE_ROLES } from '../../auth';
import { AnnouncementRepository } from './AnnouncementRepository';
import { ClassValidator } from '../classes/ClassValidator';

export type AnnouncementActor = {
  id: string;
  role?: string | null;
};

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

  /** Staff change any announcement they can read; anyone else only the ones they wrote. */
  async ensureChangeable(id: string, actor: AnnouncementActor) {
    const announcement = await this.ensureExists(id);
    if (!SCHOOL_WIDE_ROLES.includes(actor.role ?? '') && announcement.authorId !== actor.id) {
      Err(403, this.at('authorOnly'));
    }
    return announcement;
  }

  // ========================================
  // Business Logic Validations
  // ========================================

  async ensureTargetAudienceValid(targetAudience: string, classIds: string[] | null | undefined) {
    const targets = [...new Set((classIds || []).filter(Boolean))];

    if (targetAudience === 'all' && targets.length) {
      Err(400, this.at('allAudienceNoClassSection'));
    }

    if (targetAudience === 'class' && !targets.length) {
      Err(400, this.at('classRequired'));
    }

    await Promise.all(targets.map((classId) => this.classValidator.ensureExists(classId)));
    if (!(await this.announcementRepository.classesInYear(targets))) {
      Err(409, 'Announcement classes must belong to the selected academic year');
    }

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

  async ensureCanPublish(id: string, actor: AnnouncementActor) {
    const announcement = await this.ensureChangeable(id, actor);

    if (announcement.isPublished) {
      Err(409, this.at('alreadyPublished'));
    }

    return true;
  }

  async ensureCanUnpublish(id: string, actor: AnnouncementActor) {
    const announcement = await this.ensureChangeable(id, actor);

    if (!announcement.isPublished) {
      Err(409, this.at('notPublished'));
    }

    return true;
  }

  async checkExists(id: string) {
    return this.ensureExists(id);
  }

  async validateTargetAudience(targetAudience: string, classIds: string[] | null | undefined) {
    return this.ensureTargetAudienceValid(targetAudience, classIds);
  }

  async validatePublishDate(publishDate?: string, expiryDate?: string) {
    return this.ensurePublishDateValid(publishDate, expiryDate);
  }

  async checkCanPublish(id: string, actor: AnnouncementActor) {
    return this.ensureCanPublish(id, actor);
  }

  async checkCanUnpublish(id: string, actor: AnnouncementActor) {
    return this.ensureCanUnpublish(id, actor);
  }
}
