import { createGuard } from 'najm-guard';
import { Injectable, Params } from '../najm';

/** Massar originals and previews are internal inputs, never generic file URLs.
 * Case-insensitive because local storage also runs on Windows. */
@Injectable()
export class PrivateStorageGuard {
  canActivate(@Params('namespace') namespace?: string) { return namespace?.toLowerCase() !== 'massar'; }
}
export const privateStorage = createGuard(PrivateStorageGuard);
