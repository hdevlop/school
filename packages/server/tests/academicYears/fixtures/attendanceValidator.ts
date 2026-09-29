import { AttendanceValidator } from '../../../src/modules/attendance/AttendanceValidator';
import type { AttendanceRepository } from '../../../src/modules/attendance/AttendanceRepository';

export function attendanceValidator(
  repository: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
) {
  const validator = new AttendanceValidator(
    repository as unknown as AttendanceRepository,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  Object.assign(validator, { at: (key: string) => key }, overrides);
  return validator;
}
