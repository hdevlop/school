import { createGuard } from 'najm-guard';
import { Injectable, Params } from '../najm';

/**
 * Namespaces the generic file route never serves. Massar originals and
 * previews are internal inputs. Homework photos can show pupils' faces and
 * names, so they are read only through their homework, which checks who is
 * asking (GET /homework/:id/attachments/:attachmentId).
 */
export const PRIVATE_STORAGE_NAMESPACES: readonly string[] = ['massar', 'homework'];

/** Case-insensitive because local storage also runs on Windows. */
@Injectable()
export class PrivateStorageGuard {
  canActivate(@Params('namespace') namespace?: string) {
    return !PRIVATE_STORAGE_NAMESPACES.includes(namespace?.toLowerCase() ?? '');
  }
}
export const privateStorage = createGuard(PrivateStorageGuard);
