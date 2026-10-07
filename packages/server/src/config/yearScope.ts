import { ChatController } from 'najm-chatbot';
import { JevBenchmarkController } from '../modules/chat/JevBenchmarkController';
import { AlertController } from '../modules/alerts/AlertController';
import { AnnouncementController } from '../modules/announcements/AnnouncementController';
import { BehaviorRewardController } from '../modules/behaviorRewards/BehaviorRewardController';
import { ClassController } from '../modules/classes/ClassController';
import { ClassRoutineController } from '../modules/classRoutines/ClassRoutineController';
import { DisciplineController } from '../modules/discipline/DisciplineController';
import { ExamController } from '../modules/exams/ExamController';
import { SectionController } from '../modules/sections/SectionController';
import { EventController } from '../modules/events/EventController';
import { OperationsDashboardController } from '../modules/dashboard/operations/OperationsDashboardController';
import { ParentProfileController } from '../modules/profiles/ParentProfileController';
import { AssessmentController } from '../modules/assessments/AssessmentController';
import { StudentProfileController } from '../modules/profiles/StudentProfileController';
import { TeacherProfileController } from '../modules/profiles/TeacherProfileController';
import { AttendanceController } from '../modules/attendance/AttendanceController';
import { DashboardController } from '../modules/dashboard/DashboardController';
import { AcademicDashboardController } from '../modules/dashboard/academic/AcademicDashboardController';
import { FinanceDashboardController } from '../modules/dashboard/finance/FinanceDashboardController';
import { ParentController } from '../modules/parents/ParentController';
import { GradeController } from '../modules/grades/GradeController';
import { AllocationController } from '../modules/financial/allocations/AllocationController';
import { CreditController } from '../modules/financial/credits/CreditController';
import { ExpenseController } from '../modules/financial/expenses/ExpenseController';
import { FeeController } from '../modules/financial/fees/FeeController';
import { InstallmentController } from '../modules/financial/installments/InstallmentController';
import { PaymentController } from '../modules/financial/payments/PaymentController';
import { PayrollController } from '../modules/financial/payroll/PayrollController';
import { RolloverController } from '../modules/financial/rollover/RolloverController';
import { MaintenanceController } from '../modules/transport/maintenance/MaintenanceController';
import { RefuelController } from '../modules/transport/refuels/RefuelController';
import { StudentRouteController } from '../modules/transport/studentRoutes/StudentRouteController';
import { StudentController } from '../modules/students/StudentController';
import { TeacherController } from '../modules/teachers/TeacherController';
import { StudentEnrollmentController } from '../modules/studentEnrollments/StudentEnrollmentController';
import { VehicleAssignmentController } from '../modules/transport/vehicleAssignments/VehicleAssignmentController';

/**
 * One registration per controller whose routes read a migrated module, shared
 * by REST and MCP. Each key is the controller's MCP tool group. A repository's
 * year exists only inside this scope, so a controller that reads alerts or
 * announcements through another module's service belongs here too.
 */
export const yearScopedModules = {
  'payment-allocations': AllocationController,
  'student-credits': CreditController,
  expenses: ExpenseController,
  fees: FeeController,
  installments: InstallmentController,
  payments: PaymentController,
  payroll: PayrollController,
  rollover: RolloverController,
  'vehicle-maintenance': MaintenanceController,
  'vehicle-refuels': RefuelController,
  'student-routes': StudentRouteController,
  'vehicle-assignments': VehicleAssignmentController,
  students: StudentController,
  teachers: TeacherController,
  'student-enrollments': StudentEnrollmentController,
  alerts: AlertController,
  announcements: AnnouncementController,
  behavior_rewards: BehaviorRewardController,
  classes: ClassController,
  'class-routines': ClassRoutineController,
  sections: SectionController,
  discipline: DisciplineController,
  exams: ExamController,
  events: EventController,
  'operations-dashboard': OperationsDashboardController,
  parents: ParentController,
  'parent-profile': ParentProfileController,
  assessments: AssessmentController,
  'student-profile': StudentProfileController,
  'teacher-profile': TeacherProfileController,
  attendance: AttendanceController,
  dashboard: DashboardController,
  'academic-dashboard': AcademicDashboardController,
  'finance-dashboard': FinanceDashboardController,
  grades: GradeController,
};

/** Chat is an HTTP consumer of scoped tools; it exposes no MCP tool group. */
export const yearRequestControllers = [...Object.values(yearScopedModules), ChatController, JevBenchmarkController];
