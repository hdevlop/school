import { describe, expect, it } from 'bun:test';
import { AttendanceController } from '../../src/modules/attendance/AttendanceController';
import { DashboardController } from '../../src/modules/dashboard/DashboardController';
import { FinanceDashboardController } from '../../src/modules/dashboard/finance/FinanceDashboardController';
import { FeeController } from '../../src/modules/financial/fees/FeeController';
import { PaymentController } from '../../src/modules/financial/payments/PaymentController';
import { ClassRoutineController } from '../../src/modules/classRoutines/ClassRoutineController';
import { StaffController } from '../../src/modules/staff/StaffController';
import { NotificationController } from '../../src/modules/financial/notifications/NotificationController';
import { StudentController } from '../../src/modules/students/StudentController';
import { TeacherController } from '../../src/modules/teachers/TeacherController';

describe('Najm decorated request parameter resolution', () => {
  it('keeps every decorated argument visible to the installed handler.length resolver', () => {
    // A default on an earlier parameter truncates Function.length, so Najm
    // omits later @User() or @Year() values or an optional body query at runtime.
    const handlers: Array<[string, (...args: any[]) => unknown, number]> = [
      ['attendance list', AttendanceController.prototype.listAll, 2],
      ['dashboard widgets', DashboardController.prototype.getWidgets, 2],
      ['finance KPI', FinanceDashboardController.prototype.getKpis, 1],
      ['fee create', FeeController.prototype.create, 3],
      ['payment revenue', PaymentController.prototype.getTotalRevenue, 1],
      ['routine list', ClassRoutineController.prototype.list, 2],
      ['staff roster', StaffController.prototype.getAttendanceRoster, 1],
      ['notification cron list', NotificationController.prototype.listRecent, 2],
      ['student list', StudentController.prototype.getStudents, 2],
      ['teacher students', TeacherController.prototype.getStudents, 4],
    ];
    for (const [name, handler, count] of handlers) {
      expect(handler.length, name).toBe(count);
    }
  });
});
