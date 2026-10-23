#!/usr/bin/env bun

import {
  PaymentService,
  AllocationService,
  InstallmentService,
  FeeService,
  StudentService,
  StudentEnrollmentService,
  TeacherService,
  StaffService,
  PayrollService,
  VehicleAssignmentService,
  StudentRouteService,
  VehicleService,
  DriverService,
  ParentService,
  SettingsService,
  AcademicYearRepository,
  AcademicYearTransitionRepository,
  AcademicYearMigrationIssueRepository,
  ExpenseService,
  GradeService,
  AssessmentService,
  ExamService,
  AttendanceService,
  AlertRepository,
  AnnouncementRepository,
  EventService,
  RefuelService,
  MaintenanceService,
  DisciplineService,
  BehaviorRewardService,
  ClassRoutineService,
  RolloverService,
  SectionService,
  ClassService,
  CycleService,
  SubjectService,
  FeeTypeService,
} from '@sms/server/modules/seed';
import type { Server } from '@sms/server/najm';

type ResetOptions = { includeAcademic?: boolean };

export async function clearDemoData(server: Server, { includeAcademic = false }: ResetOptions = {}) {
  const allocationService = await server.container.resolve(AllocationService);
  const paymentService = await server.container.resolve(PaymentService);
  const installmentService = await server.container.resolve(InstallmentService);
  const feeService = await server.container.resolve(FeeService);
  const payrollService = await server.container.resolve(PayrollService);
  const gradeService = await server.container.resolve(GradeService);
  const assessmentService = await server.container.resolve(AssessmentService);
  const examService = await server.container.resolve(ExamService);
  const attendanceService = await server.container.resolve(AttendanceService);
  const alertRepository = await server.container.resolve(AlertRepository);
  const announcementRepository = await server.container.resolve(AnnouncementRepository);
  const eventService = await server.container.resolve(EventService);
  const refuelService = await server.container.resolve(RefuelService);
  const maintenanceService = await server.container.resolve(MaintenanceService);
  const disciplineService = await server.container.resolve(DisciplineService);
  const behaviorRewardService = await server.container.resolve(BehaviorRewardService);
  const studentRouteService = await server.container.resolve(StudentRouteService);
  const studentService = await server.container.resolve(StudentService);
  const studentEnrollmentService = await server.container.resolve(StudentEnrollmentService);
  const teacherService = await server.container.resolve(TeacherService);
  const staffService = await server.container.resolve(StaffService);
  const vehicleAssignmentService = await server.container.resolve(VehicleAssignmentService);
  const vehicleService = await server.container.resolve(VehicleService);
  const driverService = await server.container.resolve(DriverService);
  const parentService = await server.container.resolve(ParentService);
  const settingsService = await server.container.resolve(SettingsService);
  const academicYearRepository = await server.container.resolve(AcademicYearRepository);
  const yearTransitionRepository = await server.container.resolve(AcademicYearTransitionRepository);
  const migrationIssueRepository = await server.container.resolve(AcademicYearMigrationIssueRepository);
  const expenseService = await server.container.resolve(ExpenseService);
  const classRoutineService = await server.container.resolve(ClassRoutineService);
  const rolloverService = await server.container.resolve(RolloverService);

  console.log(includeAcademic
    ? '⚠️  WARNING: This will delete all school data including cycles, classes, sections, subjects and fee types in every year!\n'
    : '⚠️  WARNING: This will delete all school data except cycles, classes, sections, subjects and fee types!\n');
  console.log('🧹 Clearing all school data...');

  await classRoutineService.clearForSeedReset();
  console.log('✅ Routines cleared');

  await rolloverService.clearForSeedReset();
  console.log('✅ Academic rollovers cleared');

  await allocationService.clearForSeedReset();
  console.log('✅ Allocations cleared');

  await paymentService.clearForSeedReset();
  console.log('✅ Payments cleared');

  await payrollService.deleteAll();
  console.log('✅ Payroll cleared');

  await installmentService.deleteAll();
  console.log('✅ Installments cleared');

  await feeService.clearForSeedReset();
  console.log('✅ Fees cleared');

  await expenseService.clearForSeedReset();
  console.log('✅ Expenses cleared');

  await gradeService.clearForSeedReset();
  console.log('✅ Grades cleared');

  await assessmentService.clearForSeedReset();
  console.log('✅ Assessments cleared');

  await examService.clearForSeedReset();
  console.log('✅ Exams cleared');

  await attendanceService.clearForSeedReset();
  console.log('✅ Attendance cleared');

  await alertRepository.clearForSeedReset();
  console.log('✅ Alerts cleared');

  await announcementRepository.clearForSeedReset();
  console.log('✅ Announcements cleared');

  await eventService.clearForSeedReset();
  console.log('✅ Events cleared');

  await refuelService.clearForSeedReset();
  console.log('✅ Refuels cleared');

  await maintenanceService.clearForSeedReset();
  console.log('✅ Maintenance cleared');

  await disciplineService.deleteAll();
  console.log('✅ Discipline incidents cleared');

  await behaviorRewardService.deleteAll();
  console.log('✅ Behavior rewards cleared');

  await studentRouteService.clearForSeedReset();
  console.log('✅ Student routes cleared');

  await vehicleAssignmentService.clearForSeedReset();
  console.log('✅ Vehicle assignments cleared');

  await yearTransitionRepository.clearForSeedReset();
  await migrationIssueRepository.clearForSeedReset();
  await studentEnrollmentService.clearForSeedReset();
  await studentService.deleteAll();
  console.log('✅ Students cleared');

  await teacherService.clearForSeedReset();
  console.log('✅ Teachers cleared');

  await staffService.clearAssignmentsForSeedReset();
  console.log('✅ Staff assignments cleared');

  await vehicleService.deleteAll();
  console.log('✅ Vehicles cleared');

  await driverService.deleteAll();
  console.log('✅ Drivers cleared');

  await staffService.deleteAll();
  console.log('✅ Staff cleared');

  await parentService.clearForSeedReset();
  console.log('✅ Parents cleared');

  // Clear references from every year before removing the academic structure.
  if (includeAcademic) {
    const sectionService = await server.container.resolve(SectionService);
    const classService = await server.container.resolve(ClassService);
    const cycleService = await server.container.resolve(CycleService);
    const subjectService = await server.container.resolve(SubjectService);
    const feeTypeService = await server.container.resolve(FeeTypeService);
    await sectionService.clearForSeedReset();
    await classService.clearForSeedReset();
    await cycleService.clearForSeedReset();
    await subjectService.clearForSeedReset();
    await feeTypeService.deleteAll();
    console.log('✅ Cycles, classes, sections, subjects and fee types cleared');
  }

  await settingsService.deleteAll();
  await academicYearRepository.clearForSeedReset();
  console.log('Academic-year registry cleared');
  console.log('✅ Settings cleared');

  console.log(includeAcademic
    ? '\n✨ School data and academic structure cleared in every year.'
    : '\n✨ School data cleared. Cycles, classes, sections, subjects and fee types were kept.');
}

export async function resetDemo(options: ResetOptions = {}) {
  const { runSeedTask } = await import('../shared/run-seed');
  await runSeedTask('demo reset', (server) => clearDemoData(server, options));
}

if (import.meta.main) await resetDemo();
