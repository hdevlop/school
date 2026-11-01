import { ArrayBufferBody, Controller, Get, Post, ResMsg } from '../../najm';
import { Can } from '../../auth';
import { BackupService } from './BackupService';

/**
 * A full backup holds every account and its password hash, so both routes ask
 * for system permissions the administrator holds and the principal does not.
 */
@Controller('/backup')
export class BackupController {
  constructor(private service: BackupService) {}

  @Get()
  @Can('backup:system')
  async download() {
    return this.service.download();
  }

  /** The body is the ZIP itself. */
  @Post('/restore')
  @Can('restore:system')
  @ResMsg('backup.success.restored')
  async restore(@ArrayBufferBody() body: ArrayBuffer) {
    return this.service.restore(new Uint8Array(body));
  }
}
