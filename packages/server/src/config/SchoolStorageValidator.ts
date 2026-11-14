import { FileCategory, StorageValidator, validateFileCategory } from 'najm-storage';
import { Err, Service, t } from '../najm';

const SCHOOL_CATEGORIES = [FileCategory.IMAGE, FileCategory.PDF, FileCategory.DOCUMENT];
const MASSAR_CATEGORIES = [FileCategory.SPREADSHEET, FileCategory.TEXT];
// What HomeworkAttachmentService writes: processed WebP images and PDFs.
const HOMEWORK_CATEGORIES = [FileCategory.IMAGE, FileCategory.PDF];

/** Enforce category policy before every StorageService write, including REST. */
@Service()
export class SchoolStorageValidator extends StorageValidator {
  override resolveUploadTarget(namespace: string, rawPath: string, providedMime: string | undefined | null) {
    const target = super.resolveUploadTarget(namespace, rawPath, providedMime);
    const name = target.namespace.toLowerCase();
    const allowed = name === 'massar' ? MASSAR_CATEGORIES : name === 'homework' ? HOMEWORK_CATEGORIES : SCHOOL_CATEGORIES;
    if (!validateFileCategory(target.mimeType, allowed)) Err(400, t('files.errors.typeNotAllowed'));
    return target;
  }
}
