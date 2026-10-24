import { Body, Controller, Get, Headers, Params, Post, Query, User, Validate } from '../../najm';
import { ToolGroup } from 'najm-mcp';
import { Can } from '../../auth';
import { Policy, Student, CanList } from '../students/StudentGuards';
import { installationDto, snapshotDto, pageDto, pageQuery, type SnapshotInput } from './OfflineDto';
import type { OfflineInstallation } from '@sms/contracts/offline';
import { LANGUAGE_HEADER } from '@sms/contracts/locales';
import { OfflineService } from './OfflineService';

@ToolGroup('offline-reads')
@Policy(Student)
@Controller('/offline')
export class OfflineController {
  constructor(private offline: OfflineService) {}
  @Post('/grant')
  @Can('read:offline')
  @CanList()
  @Validate(installationDto)
  grant(@User('id') id: string, @Body() input: OfflineInstallation) { return this.offline.grant(id, input); }

  @Post('/snapshots')
  @Can('read:offline')
  @CanList()
  @Validate(snapshotDto)
  snapshot(@User('id') id: string, @Body() input: SnapshotInput, @Headers(LANGUAGE_HEADER) language?: string) {
    return this.offline.snapshot(id, input, language ?? 'en');
  }
  @Get('/snapshots/:id/pages/:page')
  @Can('read:offline')
  @CanList()
  @Validate({ params: pageDto, query: pageQuery })
  page(@User('id') id: string, @Params('id') snapshotId: string, @Params('page') page: number,
    @Query() input: OfflineInstallation & { authorizationGeneration: string }) { return this.offline.page(id, snapshotId, page, input); }
}
