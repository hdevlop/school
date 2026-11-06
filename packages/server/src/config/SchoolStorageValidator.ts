import { FileCategory, StorageValidator, validateFileCategory } from 'najm-storage';
import { Err, Service, t } from '../najm';

const SCHOOL_CATEGORIES = [FileCategory.IMAGE, FileCategory.PDF, FileCategory.DOCUMENT];
const MASSAR_CATEGORIES = [FileCategory.SPREADSHEET, FileCategory.TEXT];

/** Enforce category policy before every StorageService write, including REST. */
@Service()
export class SchoolStorageValidator extends StorageValidator {
  override resolveUploadTarget(namespace: string, rawPath: string, providedMime: string | undefined | null) {
    const target = super.resolveUploadTarget(namespace, rawPath, providedMime);
    const allowed = target.namespace.toLowerCase() === 'massar' ? MASSAR_CATEGORIES : SCHOOL_CATEGORIES;
    if (!validateFileCategory(target.mimeType, allowed)) Err(400, t('files.errors.typeNotAllowed'));
    return target;
  }
}
