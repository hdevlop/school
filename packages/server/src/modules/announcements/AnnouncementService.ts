import { Service } from '@server/najm';
import { AnnouncementRepository } from './AnnouncementRepository';
import { AnnouncementValidator } from './AnnouncementValidator';
import { pickProps } from '@server/shared';
import type { CreateAnnouncementDto, CreateAnnouncementsBulkDto, DeleteBulkAnnouncementDto, UpdateAnnouncementDto } from './AnnouncementDto';

@Service()
export class AnnouncementService {

  constructor(
    private announcementRepository: AnnouncementRepository,
    private announcementValidator: AnnouncementValidator,
  ) { }

  // ========================================
  // ANNOUNCEMENT OPERATIONS
  // ========================================

  async getAll() {
    return await this.announcementRepository.getAll();
  }

  async getStats() {
    return await this.announcementRepository.getStats();
  }

  async getRecent() {
    return await this.announcementRepository.getRecent();
  }

  async getById(id: string) {
    return this.announcementValidator.ensureExists(id);
  }

  async getByAuthor(authorId: string) {
    return await this.announcementRepository.getByAuthor(authorId);
  }

  async getByTargetAudience(targetAudience: CreateAnnouncementDto['targetAudience']) {
    return await this.announcementRepository.getByTargetAudience(targetAudience);
  }

  async getByClass(classId: string) {
    return await this.announcementRepository.getByClass(classId);
  }

  async getPublished() {
    return await this.announcementRepository.getPublished();
  }

  async getActiveForAudience(targetAudience: string, classId?: string) {
    return await this.announcementRepository.getActiveForAudience(targetAudience, classId);
  }

  async getUpcoming() {
    return await this.announcementRepository.getUpcoming();
  }

  async getExpired() {
    return await this.announcementRepository.getExpired();
  }

  private normalizeClassTargets<T extends {
    targetAudience?: CreateAnnouncementDto['targetAudience'];
    classId?: string | null;
    classIds?: string[] | null;
  }>(data: T, targetAudience = data.targetAudience) {
    const classIds = [...new Set((data.classIds ?? (data.classId ? [data.classId] : [])).filter(Boolean))];
    const targetsClasses = targetAudience === 'class';

    return {
      ...data,
      targetAudience,
      classIds: targetsClasses && classIds.length ? classIds : null,
      classId: targetsClasses ? classIds[0] ?? null : null,
    };
  }

  async create(data: CreateAnnouncementDto) {
    const normalizedData = this.normalizeClassTargets(data);
    const ANNOUNCEMENT_CREATE_KEYS = [
      'title', 'content', 'authorId', 'targetAudience', 'classId', 'classIds',
      'publishDate', 'expiryDate'
    ];

    const announcementDetails = {
      ...pickProps(normalizedData, ANNOUNCEMENT_CREATE_KEYS),
      isPublished: false,
    };

    await this.announcementValidator.ensureTargetAudienceValid(
      announcementDetails.targetAudience,
      announcementDetails.classIds
    );
    await this.announcementValidator.ensurePublishDateValid(
      announcementDetails.publishDate,
      announcementDetails.expiryDate
    );

    return await this.announcementRepository.create(announcementDetails);
  }

  async update(id: string, data: UpdateAnnouncementDto) {
    const existing = await this.announcementValidator.ensureExists(id);
    const targetAudience = (data.targetAudience ?? existing.targetAudience) as CreateAnnouncementDto['targetAudience'];
    const currentClassIds = existing.classIds?.length
      ? existing.classIds
      : existing.classId
        ? [existing.classId]
        : [];
    const normalizedData = this.normalizeClassTargets({
      ...data,
      targetAudience,
      classIds: 'classIds' in data
        ? data.classIds
        : 'classId' in data
          ? data.classId ? [data.classId] : []
          : currentClassIds,
    }, targetAudience);
    const ANNOUNCEMENT_UPDATE_KEYS = [
      'title', 'content', 'targetAudience', 'classId', 'classIds',
      'publishDate', 'expiryDate'
    ];

    const announcementData: Record<string, any> = pickProps(normalizedData, ANNOUNCEMENT_UPDATE_KEYS);
    const publishDate = announcementData.publishDate ?? existing.publishDate;
    const expiryDate = announcementData.expiryDate ?? existing.expiryDate;

    await this.announcementValidator.ensureTargetAudienceValid(targetAudience, normalizedData.classIds);
    await this.announcementValidator.ensurePublishDateValid(publishDate, expiryDate);

    return await this.announcementRepository.update(id, announcementData);
  }

  async publish(id: string) {
    await this.announcementValidator.ensureCanPublish(id);
    return await this.announcementRepository.publish(id);
  }

  async unpublish(id: string) {
    await this.announcementValidator.ensureCanUnpublish(id);
    return await this.announcementRepository.unpublish(id);
  }

  async delete(id: string) {
    await this.announcementValidator.ensureExists(id);
    const deletedAnnouncement = await this.announcementRepository.delete(id);
    return deletedAnnouncement;
  }

  async deleteAll() {
    return await this.announcementRepository.deleteAll();
  }

  async deleteBulk(ids: DeleteBulkAnnouncementDto) {
    const results = await Promise.all(
      ids.map((id) => this.delete(id))
    );
    return {
      deletedCount: results.length,
      deletedAnnouncements: results,
    };
  }

  async createBulk(announcementsData: CreateAnnouncementsBulkDto) {
    const createdAnnouncements = [];

    for (const [index, announcementData] of announcementsData.entries()) {
      try {
        const announcement = await this.create(announcementData);
        createdAnnouncements.push(announcement);
      } catch (error: any) {
        if (error?.status === 409) continue;
        const identifier = announcementData.title || `at index ${index}`;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create announcement ${identifier}: ${message}`);
      }
    }
    return createdAnnouncements;
  }
}
