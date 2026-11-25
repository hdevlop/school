import { FileCategory, StorageValidator, validateFileCategory } from 'najm-storage';
import { Err, Service, t } from '../najm';

const SCHOOL_CATEGORIES = [FileCategory.IMAGE, FileCategory.PDF, FileCategory.DOCUMENT];
const MASSAR_CATEGORIES = [FileCategory.SPREADSHEET, FileCategory.TEXT];
// What HomeworkAttachmentService writes: processed WebP images and PDFs.
const HOMEWORK_CATEGORIES = [FileCategory.IMAGE, FileCategory.PDF];
// Desk-card backgrounds are printed behind each card: images only.
const IMAGE_CATEGORIES = [FileCategory.IMAGE];
const NAMESPACE_CATEGORIES: Record<string, FileCategory[]> = {
  massar: MASSAR_CATEGORIES,
  homework: HOMEWORK_CATEGORIES,
  'desk-card-backgrounds': IMAGE_CATEGORIES,
};

/** Enforce category policy before every StorageService write, including REST. */
@Service()
export class SchoolStorageValidator extends StorageValidator {
  override resolveUploadTarget(namespace: string, rawPath: string, providedMime: string | undefined | null) {
    const target = super.resolveUploadTarget(namespace, rawPath, providedMime);
    const name = target.namespace.toLowerCase();
    const allowed = NAMESPACE_CATEGORIES[name] ?? SCHOOL_CATEGORIES;
    if (!validateFileCategory(target.mimeType, allowed)) Err(400, t('files.errors.typeNotAllowed'));
    return target;
  }
}
