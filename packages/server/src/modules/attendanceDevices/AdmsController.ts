import { Controller, Get, Post, Query, RawResponse, TextBody, Validate } from '../../najm';
import { Public } from 'najm-guard';
import { AttendanceDeviceService } from './AttendanceDeviceService';
import { admsQueryDto, type AdmsQueryDto } from './AttendanceDeviceDto';

const text = (body: string) => new Response(body, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
});

/**
 * The address a fingerprint terminal's "Cloud Server" (ADMS) setting points
 * at: `/iclock/*`, which the dashboard forwards here. A device has no session;
 * it is known by its serial number, and AttendanceDeviceValidator answers only
 * the serials listed in ATTENDANCE_DEVICE_SERIALS. Answers are plain text, as
 * the device expects.
 */
@Controller('/iclock')
@Public()
export class AdmsController {
  constructor(private service: AttendanceDeviceService) {}

  @Get('/cdata')
  @RawResponse()
  @Validate({ query: admsQueryDto })
  async handshake(@Query() query: AdmsQueryDto) {
    return text(await this.service.handshake(query.SN));
  }

  @Post('/cdata')
  @RawResponse()
  @Validate({ query: admsQueryDto })
  async upload(@Query() query: AdmsQueryDto, @TextBody() body: string) {
    const accepted = await this.service.receive(query.SN, query.table, body ?? '');
    return text(`OK: ${accepted}`);
  }

  @Get('/getrequest')
  @RawResponse()
  @Validate({ query: admsQueryDto })
  async poll(@Query() query: AdmsQueryDto) {
    await this.service.poll(query.SN);
    return text('OK');
  }

  // The device reports the result of a command; School sends none.
  @Post('/devicecmd')
  @RawResponse()
  @Validate({ query: admsQueryDto })
  async commandResult(@Query() query: AdmsQueryDto) {
    await this.service.poll(query.SN);
    return text('OK');
  }
}
