#!/usr/bin/env bun

import {
  PaymentService,
  AllocationService,
  InstallmentService,
  FeeService,
  StudentService,
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
  ExpenseService,
  GradeService,
  AssessmentService,
  ExamService,
  AttendanceService,
  AlertService,
  AnnouncementService,
  EventService,
  RefuelService,
  MaintenanceService,
  DisciplineService,
  BehaviorRewardService,
} from '@server/modules/seed';
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
  const alertService = await server.container.resolve(AlertService);
  const announcementService = await server.container.resolve(AnnouncementService);
  const eventService = await server.container.resolve(EventService);
  const refuelService = await server.container.resolve(RefuelService);
  const maintenanceService = await server.container.resolve(MaintenanceService);
  const disciplineService = await server.container.resolve(DisciplineService);
  const behaviorRewardService = await server.container.resolve(BehaviorRewardService);
  const studentRouteService = await server.container.resolve(StudentRouteService);
  const studentService = await server.container.resolve(StudentService);
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
  const expenseService = await server.container.resolve(ExpenseService);

  console.log('⚠️  WARNING: This will delete all school data!\n');
  console.log('🧹 Clearing all school data...');

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

  await gradeService.deleteAll();
  console.log('✅ Grades cleared');

  await assessmentService.deleteAll();
  console.log('✅ Assessments cleared');

  await examService.deleteAll();
  console.log('✅ Exams cleared');

  await attendanceService.deleteAll();
  console.log('✅ Attendance cleared');

  await alertService.deleteAll();
  console.log('✅ Alerts cleared');

  await announcementService.deleteAll();
  console.log('✅ Announcements cleared');

  await eventService.deleteAll();
  console.log('✅ Events cleared');

  await refuelService.deleteAll();
  console.log('✅ Refuels cleared');

  await maintenanceService.deleteAll();
  console.log('✅ Maintenance cleared');

  await disciplineService.deleteAll();
  console.log('✅ Discipline incidents cleared');

  await behaviorRewardService.deleteAll();
  console.log('✅ Behavior rewards cleared');

  await studentRouteService.deleteAll();
  console.log('✅ Student routes cleared');

  await vehicleAssignmentService.deleteAll();
  console.log('✅ Vehicle assignments cleared');

  await studentService.deleteAll();
  console.log('✅ Students cleared');

  await teacherService.deleteAll();
  console.log('✅ Teachers cleared');

  await vehicleService.deleteAll();
  console.log('✅ Vehicles cleared');

  await driverService.deleteAll();
  console.log('✅ Drivers cleared');

  await staffService.deleteAll();
  console.log('✅ Staff cleared');

  await parentService.deleteAll();
  console.log('✅ Parents cleared');

  await sectionService.deleteAll();
  console.log('✅ Sections cleared');

  await classService.deleteAll();
  console.log('✅ Classes cleared');

  await subjectService.deleteAll();
  console.log('✅ Subjects cleared');

  await feeTypeService.deleteAll();
  console.log('✅ Fee types cleared');

  await settingsService.deleteAll();
  console.log('✅ Settings cleared');

  console.log('\n✨ All school data cleared successfully!');
});
