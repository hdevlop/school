import { RateLimit } from 'najm-rate';
import { ArrayBufferBody, Body, Controller, Get, Post, ResMsg, User, Validate } from '../../najm';
import { Can, isAdmin } from '../../auth';
import { resetSchoolDto, type ResetSchoolDto } from './BackupDto';
import { BackupService } from './BackupService';

/**
 * A full backup holds every account and its password hash, so these routes ask
 * for system permissions the administrator holds and the principal does not.
 * The reset deletes everything, roles included, so it is the administrator's
 * alone and also asks for their password.
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

  @Post('/reset')
  @isAdmin()
  @RateLimit({ limit: 5, window: '10m', key: 'user' })
  @Validate(resetSchoolDto)
  @ResMsg('backup.success.reset')
  async reset(@Body() { password }: ResetSchoolDto, @User('id') userId: string) {
    return this.service.reset(password, userId);
  }
}
