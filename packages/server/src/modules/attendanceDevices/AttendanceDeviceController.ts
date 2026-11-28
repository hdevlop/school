import { Body, Controller, Get, Params, Put, ResMsg, Validate } from '../../najm';
import { CanSchoolWide } from '../../auth';
import { AttendanceDeviceService } from './AttendanceDeviceService';
import { deviceUserIdParam, linkDeviceUserDto, type LinkDeviceUserDto } from './AttendanceDeviceDto';

/**
 * The staff-attendance screen's view of the fingerprint terminals: which ones
 * have connected, and which device PIN belongs to which staff member.
 */
@Controller('/attendance-devices')
export class AttendanceDeviceController {
  constructor(private service: AttendanceDeviceService) {}

  @Get()
  @CanSchoolWide('read:staff-attendance')
  @ResMsg('attendanceDevices.success.retrieved')
  async listDevices() {
    return this.service.listDevices();
  }

  @Get('/people')
  @CanSchoolWide('read:staff-attendance')
  @ResMsg('attendanceDevices.success.retrieved')
  async listPeople() {
    return this.service.listPeople();
  }

  @Put('/people/:deviceUserId')
  @CanSchoolWide('update:staff-attendance')
  @Validate({ params: deviceUserIdParam, body: linkDeviceUserDto })
  @ResMsg('attendanceDevices.success.linked')
  async link(@Params('deviceUserId') deviceUserId: string, @Body() body: LinkDeviceUserDto) {
    return this.service.link(deviceUserId, body.staffId);
  }
}
