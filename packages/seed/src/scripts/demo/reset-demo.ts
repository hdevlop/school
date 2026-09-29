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
  SectionService,
  ClassService,
  SubjectService,
  FeeTypeService,
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
} from '@sms/server/modules/seed';
import { runSeedTask } from '../shared/run-seed';

runSeedTask('demo reset', async (server) => {
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
  const sectionService = await server.container.resolve(SectionService);
  const classService = await server.container.resolve(ClassService);
  const subjectService = await server.container.resolve(SubjectService);
  const feeTypeService = await server.container.resolve(FeeTypeService);
  const settingsService = await server.container.resolve(SettingsService);
  const academicYearRepository = await server.container.resolve(AcademicYearRepository);
  const yearTransitionRepository = await server.container.resolve(AcademicYearTransitionRepository);
  const migrationIssueRepository = await server.container.resolve(AcademicYearMigrationIssueRepository);
  const expenseService = await server.container.resolve(ExpenseService);
  const classRoutineService = await server.container.resolve(ClassRoutineService);
  const rolloverService = await server.container.resolve(RolloverService);

  console.log('⚠️  WARNING: This will delete all school data!\n');
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

  await sectionService.clearForSeedReset();
  console.log('✅ Sections cleared');

  await classService.clearForSeedReset();
  console.log('✅ Classes cleared');

  await subjectService.clearForSeedReset();
  console.log('✅ Subjects cleared');

  await feeTypeService.deleteAll();
  console.log('✅ Fee types cleared');

  await settingsService.deleteAll();
  await academicYearRepository.clearForSeedReset();
  console.log('Academic-year registry cleared');
  console.log('✅ Settings cleared');

  console.log('\n✨ All school data cleared successfully!');
});
