import { Service } from '@server/najm';
import { RoleService } from 'najm-auth';

import { AllocationService } from './financial/allocations/AllocationService';
import { PaymentService } from './financial/payments/PaymentService';
import { InstallmentService } from './financial/installments/InstallmentService';
import { FeeService } from './financial/fees/FeeService';
import { FeeTypeService } from './financial/feeTypes/FeeTypeService';
import { PayrollService } from './financial/payroll/PayrollService';
import { ExpenseService } from './financial/expenses/ExpenseService';

import { StudentService } from './students/StudentService';
import { TeacherService } from './teachers/TeacherService';
import { StaffService } from './staff/StaffService';
import { ParentService } from './parents/ParentService';

import { VehicleAssignmentService } from './transport/vehicleAssignments/VehicleAssignmentService';
import { StudentRouteService } from './transport/studentRoutes/StudentRouteService';
import { VehicleService } from './transport/vehicles/VehicleService';
import { DriverService } from './transport/drivers/DriverService';
import { RefuelService } from './transport/refuels/RefuelService';
import { MaintenanceService } from './transport/maintenance/MaintenanceService';

import { GradeService } from './grades/GradeService';
import { AssessmentService } from './assessments/AssessmentService';
import { AttendanceService } from './attendance/AttendanceService';
import { ExamService } from './exams/ExamService';
import { AnnouncementService } from './announcements/AnnouncementService';
import { EventService as SchoolEventService } from './events/EventService';
import { AlertService } from './alerts/AlertService';

import { SectionService } from './sections/SectionService';
import { ClassService } from './classes/ClassService';
import { SubjectService } from './subjects/SubjectService';
import { SettingsService } from './settings/SettingsService';

// ─── static seed data ────────────────────────────────────────────────────────
import rolesData from './seed-data/admin/roles.json';
import driversData from './seed-data/demo/drivers.json';
import feesData from './seed-data/demo/fees.json';
import parentsData from './seed-data/demo/parents.json';
import studentsData from './seed-data/demo/students.json';
import teachersData from './seed-data/demo/teachers.json';
import vehiclesData from './seed-data/demo/vehicles.json';
import classesData from './seed-data/school/classes.json';
import feeTypesData from './seed-data/school/feeTypes.json';
import sectionsData from './seed-data/school/sections.json';
import settingsData from './seed-data/school/settings.json';
import subjectsData from './seed-data/school/subjects.json';

const schoolSettingsData = {
  ...settingsData,
  calendarSystem: settingsData.calendarSystem as 'SEMESTER' | 'TRIMESTER' | 'QUARTER',
  language: settingsData.language as 'en' | 'fr' | 'ar' | 'es',
};

const normalizedVehicles = vehiclesData.map((v) => ({ ...v, image: null }));

const normalizedFees = feesData.map((f) => ({
  ...f,
  baseAmount: undefined,
  grossAmount: undefined,
  netAmount: undefined,
  paidAmount: undefined,
}));

const DEFAULT_TEACHER_LIMIT = 60;

@Service()
export class SeedService {
  constructor(
    private roleService: RoleService,
    private allocationService: AllocationService,
    private paymentService: PaymentService,
    private installmentService: InstallmentService,
    private feeService: FeeService,
    private feeTypeService: FeeTypeService,
    private payrollService: PayrollService,
    private expenseService: ExpenseService,
    private gradeService: GradeService,
    private assessmentService: AssessmentService,
    private attendanceService: AttendanceService,
    private examService: ExamService,
    private announcementService: AnnouncementService,
    private schoolEventService: SchoolEventService,
    private alertService: AlertService,
    private studentService: StudentService,
    private teacherService: TeacherService,
    private staffService: StaffService,
    private studentRouteService: StudentRouteService,
    private refuelService: RefuelService,
    private maintenanceService: MaintenanceService,
    private vehicleAssignmentService: VehicleAssignmentService,
    private vehicleService: VehicleService,
    private driverService: DriverService,
    private parentService: ParentService,
    private sectionService: SectionService,
    private classService: ClassService,
    private subjectService: SubjectService,
    private settingsService: SettingsService,
  ) {}

  /** Seed school structure only (settings, subjects, classes, sections, feeTypes, roles) */
  async seedSystem() {
    await this.clearAllData();
    await this.roleService.seedDefaultRoles(rolesData as any);
    await this.settingsService.create(schoolSettingsData as any);
    await this.subjectService.seedDemoSubjects(subjectsData as any);
    await this.classService.seedDemoClasses(classesData as any);
    await this.sectionService.seedDemoSections(sectionsData as any);
    await this.feeTypeService.seedDemoFeeTypes(feeTypesData as any);
  }

  /** Seed full demo data (school structure + all people + fees) */
  async seedDemo(opts: { students?: number; teachers?: number } = {}) {
    await this.seedSystem();

    const studentLimit = opts.students ?? studentsData.length;
    const teacherLimit = opts.teachers ?? Math.min(DEFAULT_TEACHER_LIMIT, teachersData.length);

    const selectedStudents = (studentsData as any[]).slice(0, studentLimit);

    // keep only parents referenced by the selected students
    const neededParentIds = new Set(
      selectedStudents.flatMap((s: any) => s.parentIds ?? [])
    );
    const selectedParents = (parentsData as any[]).filter((p: any) =>
      neededParentIds.has(p.id)
    );

    // keep only fees for the selected students
    const selectedStudentIds = new Set(selectedStudents.map((s: any) => s.id));
    const selectedFees = normalizedFees.filter((f: any) =>
      selectedStudentIds.has(f.studentId)
    );

    const selectedTeachers = (teachersData as any[]).slice(0, teacherLimit);

    await this.parentService.createBulk(selectedParents);
    await this.driverService.createBulk(driversData as any);
    await this.vehicleService.createBulk(normalizedVehicles as any);
    await this.teacherService.createBulk(selectedTeachers);
    await this.studentService.createBulk(selectedStudents);
    await this.feeService.createBulk(selectedFees);
  }

  /**
   * Delete all school data in dependency order, preserving the admin user.
   */
  async clearAllData() {
    await this.allocationService.clearForSeedReset();
    await this.paymentService.clearForSeedReset();
    await this.payrollService.deleteAll();
    await this.installmentService.deleteAll();
    await this.feeService.clearForSeedReset();
    await this.expenseService.clearForSeedReset();
    await this.gradeService.deleteAll();
    await this.assessmentService.deleteAll();
    await this.examService.deleteAll();
    await this.attendanceService.deleteAll();
    await this.alertService.deleteAll();
    await this.announcementService.deleteAll();
    await this.schoolEventService.deleteAll();
    await this.refuelService.deleteAll();
    await this.maintenanceService.deleteAll();
    await this.studentRouteService.deleteAll();
    await this.vehicleAssignmentService.deleteAll();
    await this.studentService.deleteAll();
    await this.teacherService.deleteAll();
    await this.vehicleService.deleteAll();
    await this.driverService.deleteAll();
    await this.staffService.deleteAll();
    await this.parentService.deleteAll();
    await this.sectionService.deleteAll();
    await this.classService.deleteAll();
    await this.subjectService.deleteAll();
    await this.feeTypeService.deleteAll();
    await this.settingsService.deleteAll();
  }
}
