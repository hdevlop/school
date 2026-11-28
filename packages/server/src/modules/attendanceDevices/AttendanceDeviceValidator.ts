import { Err, I18n, Service } from '../../najm';
import { env } from '../../env';
import { StaffRepository } from '../staff/StaffRepository';

@Service()
export class AttendanceDeviceValidator {
  @I18n('attendanceDevices.errors') private t!: (key: string, params?: Record<string, unknown>) => string;

  constructor(private staff: StaffRepository) {}

  /**
   * A device is known only by the serial number it sends, so only a serial
   * listed in ATTENDANCE_DEVICE_SERIALS is answered; the rest are refused
   * before anything is stored.
   */
  ensureAllowedDevice(serialNumber: string | undefined): string {
    const serial = serialNumber?.trim() ?? '';
    if (!serial || !env.attendance.deviceSerials.includes(serial)) Err(403, this.t('deviceNotAllowed'));
    return serial;
  }

  async ensureStaffExists(staffId: string) {
    const row = await this.staff.findNameById(staffId);
    if (!row) Err(404, this.t('staffNotFound'));
    return row!;
  }

  /** A PIN belongs to one staff member; linking it elsewhere first needs it unlinked. */
  async ensureDeviceUserIdFree(deviceUserId: string, staffId: string) {
    const holder = await this.staff.findNameByDeviceUserId(deviceUserId);
    if (holder && holder.id !== staffId) Err(409, this.t('deviceUserIdTaken', { name: holder.name }));
  }
}
