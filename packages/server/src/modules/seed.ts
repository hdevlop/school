import type { Container, Constructor } from '@server/najm';

export { SettingsService } from './settings/SettingsService';
export { SettingsRepository } from './settings/SettingsRepository';
export { SettingsValidator } from './settings/SettingsValidator';

export { SubjectService } from './subjects/SubjectService';
export { SubjectRepository } from './subjects/SubjectRepository';
export { SubjectValidator } from './subjects/SubjectValidator';

export { ClassService } from './classes/ClassService';
export { ClassRepository } from './classes/ClassRepository';
export { ClassValidator } from './classes/ClassValidator';

export { SectionService } from './sections/SectionService';
export { SectionRepository } from './sections/SectionRepository';
export { SectionValidator } from './sections/SectionValidator';

export { FeeTypeService } from './financial/feeTypes/FeeTypeService';
export { FeeTypeRepository } from './financial/feeTypes/FeeTypeRepository';
export { FeeTypeValidator } from './financial/feeTypes/FeeTypeValidator';

export { FeeService } from './financial/fees/FeeService';
export { FeeRepository } from './financial/fees/FeeRepository';
export { FeeValidator } from './financial/fees/FeeValidator';

export { InstallmentService } from './financial/installments/InstallmentService';
export { InstallmentRepository } from './financial/installments/InstallmentRepository';
export { InstallmentValidator } from './financial/installments/InstallmentValidator';

export { PaymentService } from './financial/payments/PaymentService';
export { PaymentRepository } from './financial/payments/PaymentRepository';
export { PaymentValidator } from './financial/payments/PaymentValidator';

export { AllocationService } from './financial/allocations/AllocationService';
export { AllocationRepository } from './financial/allocations/AllocationRepository';
export { AllocationValidator } from './financial/allocations/AllocationValidator';

export { ExpenseService } from './financial/expenses/ExpenseService';
export { ExpenseRepository } from './financial/expenses/ExpenseRepository';
export { ExpenseValidator } from './financial/expenses/ExpenseValidator';

export { PayrollService } from './financial/payroll/PayrollService';
export { PayrollRepository } from './financial/payroll/PayrollRepository';
export { PayrollValidator } from './financial/payroll/PayrollValidator';

export { FinancialAuditService } from './financial/auditLog/FinancialAuditService';
export { AuditLogRepository } from './financial/auditLog/AuditLogRepository';

export { CreditService } from './financial/credits/CreditService';
export { CreditRepository } from './financial/credits/CreditRepository';

export { ParentService } from './parents/ParentService';
export { ParentRepository } from './parents/ParentRepository';
export { ParentValidator } from './parents/ParentValidator';

export { StaffService } from './staff/StaffService';
export { StaffRepository } from './staff/StaffRepository';
export { StaffValidator } from './staff/StaffValidator';
export { StaffAssignmentRepository } from './staff/StaffAssignmentRepository';
export { StaffRoleService } from './staff/roles/StaffRoleService';
export { StaffRoleRepository } from './staff/roles/StaffRoleRepository';

export { TeacherService } from './teachers/TeacherService';
export { TeacherRepository } from './teachers/TeacherRepository';
export { TeacherValidator } from './teachers/TeacherValidator';

export { StudentService } from './students/StudentService';
export { StudentRepository } from './students/StudentRepository';
export { StudentValidator } from './students/StudentValidator';

export { DriverService } from './transport/drivers/DriverService';
export { DriverRepository } from './transport/drivers/DriverRepository';
export { DriverValidator } from './transport/drivers/DriverValidator';

export { VehicleService } from './transport/vehicles/VehicleService';
export { VehicleRepository } from './transport/vehicles/VehicleRepository';
export { VehicleValidator } from './transport/vehicles/VehicleValidator';

export { VehicleAssignmentService } from './transport/vehicleAssignments/VehicleAssignmentService';
export { VehicleAssignmentRepository } from './transport/vehicleAssignments/VehicleAssignmentRepository';
export { VehicleAssignmentValidator } from './transport/vehicleAssignments/VehicleAssignmentValidator';

export { StudentRouteService } from './transport/studentRoutes/StudentRouteService';
export { StudentRouteRepository } from './transport/studentRoutes/StudentRouteRepository';
export { StudentRouteValidator } from './transport/studentRoutes/StudentRouteValidator';

export { RefuelService } from './transport/refuels/RefuelService';
export { RefuelRepository } from './transport/refuels/RefuelRepository';
export { RefuelValidator } from './transport/refuels/RefuelValidator';

export { MaintenanceService } from './transport/maintenance/MaintenanceService';
export { MaintenanceRepository } from './transport/maintenance/MaintenanceRepository';
export { MaintenanceValidator } from './transport/maintenance/MaintenanceValidator';

export { AttendanceService } from './attendance/AttendanceService';
export { AttendanceRepository } from './attendance/AttendanceRepository';
export { AttendanceValidator } from './attendance/AttendanceValidator';

export { AnnouncementService } from './announcements/AnnouncementService';
export { AnnouncementRepository } from './announcements/AnnouncementRepository';
export { AnnouncementValidator } from './announcements/AnnouncementValidator';

export { EventService } from './events/EventService';
export { EventRepository } from './events/EventRepository';
export { EventValidator } from './events/EventValidator';

export { AssessmentService } from './assessments/AssessmentService';
export { AssessmentRepository } from './assessments/AssessmentRepository';
export { AssessmentValidator } from './assessments/AssessmentValidator';

export { ExamService } from './exams/ExamService';
export { ExamRepository } from './exams/ExamRepository';
export { ExamValidator } from './exams/ExamValidator';

export { GradeService } from './grades/GradeService';
export { GradeRepository } from './grades/GradeRepository';
export { GradeValidator } from './grades/GradeValidator';

export { AlertService } from './alerts/AlertService';
export { AlertRepository } from './alerts/AlertRepository';
export { AlertValidator } from './alerts/AlertValidator';

export { DisciplineService } from './discipline/DisciplineService';
export { DisciplineRepository } from './discipline/DisciplineRepository';
export { DisciplineValidator } from './discipline/DisciplineValidator';

export { BehaviorRewardService } from './behaviorRewards/BehaviorRewardService';
export { BehaviorRewardRepository } from './behaviorRewards/BehaviorRewardRepository';
export { BehaviorRewardValidator } from './behaviorRewards/BehaviorRewardValidator';

export { HealthService } from './health/HealthService';

import { AuthService, UserService, UserValidator } from '@server/auth';
import { RoleService, PermissionService } from 'najm-auth';
import { StorageService } from 'najm-storage';

import { SettingsService } from './settings/SettingsService';
import { SettingsRepository } from './settings/SettingsRepository';
import { SettingsValidator } from './settings/SettingsValidator';

import { SubjectService } from './subjects/SubjectService';
import { SubjectRepository } from './subjects/SubjectRepository';
import { SubjectValidator } from './subjects/SubjectValidator';

import { ClassService } from './classes/ClassService';
import { ClassRepository } from './classes/ClassRepository';
import { ClassValidator } from './classes/ClassValidator';

import { SectionService } from './sections/SectionService';
import { SectionRepository } from './sections/SectionRepository';
import { SectionValidator } from './sections/SectionValidator';

import { FeeTypeService } from './financial/feeTypes/FeeTypeService';
import { FeeTypeRepository } from './financial/feeTypes/FeeTypeRepository';
import { FeeTypeValidator } from './financial/feeTypes/FeeTypeValidator';

import { FeeService } from './financial/fees/FeeService';
import { FeeRepository } from './financial/fees/FeeRepository';
import { FeeValidator } from './financial/fees/FeeValidator';

import { InstallmentService } from './financial/installments/InstallmentService';
import { InstallmentRepository } from './financial/installments/InstallmentRepository';
import { InstallmentValidator } from './financial/installments/InstallmentValidator';

import { PaymentService } from './financial/payments/PaymentService';
import { PaymentRepository } from './financial/payments/PaymentRepository';
import { PaymentValidator } from './financial/payments/PaymentValidator';

import { AllocationService } from './financial/allocations/AllocationService';
import { AllocationRepository } from './financial/allocations/AllocationRepository';
import { AllocationValidator } from './financial/allocations/AllocationValidator';

import { ExpenseService } from './financial/expenses/ExpenseService';
import { ExpenseRepository } from './financial/expenses/ExpenseRepository';
import { ExpenseValidator } from './financial/expenses/ExpenseValidator';

import { PayrollService } from './financial/payroll/PayrollService';
import { PayrollRepository } from './financial/payroll/PayrollRepository';
import { PayrollValidator } from './financial/payroll/PayrollValidator';

import { FinancialAuditService } from './financial/auditLog/FinancialAuditService';
import { AuditLogRepository } from './financial/auditLog/AuditLogRepository';

import { CreditService } from './financial/credits/CreditService';
import { CreditRepository } from './financial/credits/CreditRepository';

import { ParentService } from './parents/ParentService';
import { ParentRepository } from './parents/ParentRepository';
import { ParentValidator } from './parents/ParentValidator';

import { StaffService } from './staff/StaffService';
import { StaffRepository } from './staff/StaffRepository';
import { StaffValidator } from './staff/StaffValidator';
import { StaffAssignmentRepository } from './staff/StaffAssignmentRepository';
import { StaffRoleService } from './staff/roles/StaffRoleService';
import { StaffRoleRepository } from './staff/roles/StaffRoleRepository';

import { TeacherService } from './teachers/TeacherService';
import { TeacherRepository } from './teachers/TeacherRepository';
import { TeacherValidator } from './teachers/TeacherValidator';

import { StudentService } from './students/StudentService';
import { StudentRepository } from './students/StudentRepository';
import { StudentValidator } from './students/StudentValidator';

import { DriverService } from './transport/drivers/DriverService';
import { DriverRepository } from './transport/drivers/DriverRepository';
import { DriverValidator } from './transport/drivers/DriverValidator';

import { VehicleService } from './transport/vehicles/VehicleService';
import { VehicleRepository } from './transport/vehicles/VehicleRepository';
import { VehicleValidator } from './transport/vehicles/VehicleValidator';

import { VehicleAssignmentService } from './transport/vehicleAssignments/VehicleAssignmentService';
import { VehicleAssignmentRepository } from './transport/vehicleAssignments/VehicleAssignmentRepository';
import { VehicleAssignmentValidator } from './transport/vehicleAssignments/VehicleAssignmentValidator';

import { StudentRouteService } from './transport/studentRoutes/StudentRouteService';
import { StudentRouteRepository } from './transport/studentRoutes/StudentRouteRepository';
import { StudentRouteValidator } from './transport/studentRoutes/StudentRouteValidator';

import { RefuelService } from './transport/refuels/RefuelService';
import { RefuelRepository } from './transport/refuels/RefuelRepository';
import { RefuelValidator } from './transport/refuels/RefuelValidator';

import { MaintenanceService } from './transport/maintenance/MaintenanceService';
import { MaintenanceRepository } from './transport/maintenance/MaintenanceRepository';
import { MaintenanceValidator } from './transport/maintenance/MaintenanceValidator';

import { AttendanceService } from './attendance/AttendanceService';
import { AttendanceRepository } from './attendance/AttendanceRepository';
import { AttendanceValidator } from './attendance/AttendanceValidator';

import { AnnouncementService } from './announcements/AnnouncementService';
import { AnnouncementRepository } from './announcements/AnnouncementRepository';
import { AnnouncementValidator } from './announcements/AnnouncementValidator';

import { EventService } from './events/EventService';
import { EventRepository } from './events/EventRepository';
import { EventValidator } from './events/EventValidator';

import { AssessmentService } from './assessments/AssessmentService';
import { AssessmentRepository } from './assessments/AssessmentRepository';
import { AssessmentValidator } from './assessments/AssessmentValidator';

import { ExamService } from './exams/ExamService';
import { ExamRepository } from './exams/ExamRepository';
import { ExamValidator } from './exams/ExamValidator';

import { GradeService } from './grades/GradeService';
import { GradeRepository } from './grades/GradeRepository';
import { GradeValidator } from './grades/GradeValidator';

import { AlertService } from './alerts/AlertService';
import { AlertRepository } from './alerts/AlertRepository';
import { AlertValidator } from './alerts/AlertValidator';

import { DisciplineService } from './discipline/DisciplineService';
import { DisciplineRepository } from './discipline/DisciplineRepository';
import { DisciplineValidator } from './discipline/DisciplineValidator';

import { BehaviorRewardService } from './behaviorRewards/BehaviorRewardService';
import { BehaviorRewardRepository } from './behaviorRewards/BehaviorRewardRepository';
import { BehaviorRewardValidator } from './behaviorRewards/BehaviorRewardValidator';

function registerSeedDeps(seedContainer: Container, token: Constructor, deps: Constructor[]) {
  seedContainer.set(token, { deps });
}

export function configureSeedContainer(seedContainer: Container) {
  registerSeedDeps(seedContainer, SettingsValidator, [SettingsRepository]);
  registerSeedDeps(seedContainer, SettingsService, [SettingsRepository, SettingsValidator]);

  registerSeedDeps(seedContainer, SubjectValidator, [SubjectRepository]);
  registerSeedDeps(seedContainer, SubjectService, [SubjectRepository, SubjectValidator]);

  registerSeedDeps(seedContainer, ClassValidator, [ClassRepository]);
  registerSeedDeps(seedContainer, ClassService, [ClassRepository, ClassValidator]);

  registerSeedDeps(seedContainer, SectionValidator, [SectionRepository, ClassRepository]);
  registerSeedDeps(seedContainer, SectionService, [SectionRepository, SectionValidator]);

  registerSeedDeps(seedContainer, FeeTypeValidator, [FeeTypeRepository]);
  registerSeedDeps(seedContainer, FeeTypeService, [FeeTypeRepository, FeeTypeValidator]);

  registerSeedDeps(seedContainer, ParentValidator, [ParentRepository, UserValidator]);
  registerSeedDeps(seedContainer, ParentService, [ParentRepository, ParentValidator, UserService, AuthService, StorageService]);

  registerSeedDeps(seedContainer, StaffRoleService, [StaffRoleRepository, RoleService, PermissionService]);
  registerSeedDeps(seedContainer, StaffValidator, [StaffRepository, StaffRoleRepository]);
  registerSeedDeps(seedContainer, StaffAssignmentRepository, []);
  registerSeedDeps(seedContainer, StaffService, [StaffRepository, StaffValidator, UserService, AuthService, StorageService, DriverRepository, StaffAssignmentRepository, VehicleAssignmentRepository]);

  registerSeedDeps(seedContainer, DriverValidator, [DriverRepository, UserValidator]);
  registerSeedDeps(seedContainer, DriverService, [DriverRepository, DriverValidator, UserService, StorageService, StaffService]);

  registerSeedDeps(seedContainer, VehicleAssignmentValidator, [VehicleAssignmentRepository]);
  registerSeedDeps(seedContainer, VehicleAssignmentService, [VehicleAssignmentRepository, VehicleAssignmentValidator]);

  registerSeedDeps(seedContainer, VehicleValidator, [VehicleRepository]);
  registerSeedDeps(seedContainer, VehicleService, [VehicleRepository, VehicleValidator, VehicleAssignmentService]);

  registerSeedDeps(seedContainer, TeacherValidator, [
    TeacherRepository,
    SectionValidator,
    UserValidator,
    ClassValidator,
    SubjectValidator,
  ]);
  registerSeedDeps(seedContainer, TeacherService, [TeacherRepository, TeacherValidator, UserService, AuthService, StorageService, StaffService]);

  registerSeedDeps(seedContainer, StudentValidator, [
    StudentRepository,
    UserValidator,
    ClassValidator,
    SectionValidator,
  ]);
  registerSeedDeps(seedContainer, StudentService, [
    StudentRepository,
    StudentValidator,
    UserService,
    AuthService,
    ParentService,
    FeeService,
    StorageService,
  ]);

  registerSeedDeps(seedContainer, FinancialAuditService, [AuditLogRepository]);

  registerSeedDeps(seedContainer, FeeValidator, [FeeRepository, StudentValidator, FeeTypeValidator, SettingsRepository]);
  registerSeedDeps(seedContainer, FeeService, [FeeRepository, FeeValidator, InstallmentService, SettingsRepository, ClassRepository, StudentRepository, FinancialAuditService]);

  registerSeedDeps(seedContainer, InstallmentValidator, [InstallmentRepository, FeeValidator]);
  registerSeedDeps(seedContainer, InstallmentService, [
    InstallmentRepository,
    InstallmentValidator,
    SettingsRepository,
  ]);

  registerSeedDeps(seedContainer, AllocationValidator, [
    AllocationRepository,
    PaymentRepository,
    FeeRepository,
    InstallmentRepository,
  ]);
  registerSeedDeps(seedContainer, AllocationService, [
    AllocationRepository,
    AllocationValidator,
    InstallmentRepository,
    InstallmentService,
    FeeService,
    FinancialAuditService,
  ]);

  registerSeedDeps(seedContainer, CreditService, [
    CreditRepository,
    AllocationRepository,
    AllocationService,
    InstallmentRepository,
    FeeService,
    FinancialAuditService,
  ]);

  registerSeedDeps(seedContainer, ExpenseValidator, [ExpenseRepository]);
  registerSeedDeps(seedContainer, ExpenseService, [ExpenseRepository, ExpenseValidator, FinancialAuditService]);

  registerSeedDeps(seedContainer, PayrollValidator, [PayrollRepository]);
  registerSeedDeps(seedContainer, PayrollService, [PayrollRepository, PayrollValidator, StaffRepository, FinancialAuditService]);

  registerSeedDeps(seedContainer, PaymentValidator, [PaymentRepository, StudentValidator, InstallmentValidator, FeeRepository]);
  registerSeedDeps(seedContainer, PaymentService, [
    PaymentRepository,
    PaymentValidator,
    AllocationService,
    AllocationRepository,
    FeeService,
    InstallmentRepository,
    FinancialAuditService,
    CreditService,
  ]);

  registerSeedDeps(seedContainer, AttendanceValidator, [
    AttendanceRepository,
    StudentValidator,
    TeacherValidator,
    SectionValidator,
    SubjectValidator,
  ]);
  registerSeedDeps(seedContainer, AttendanceService, [AttendanceRepository, AttendanceValidator]);

  registerSeedDeps(seedContainer, AnnouncementValidator, [
    AnnouncementRepository,
    ClassValidator,
    SectionValidator,
  ]);
  registerSeedDeps(seedContainer, AnnouncementService, [AnnouncementRepository, AnnouncementValidator]);

  registerSeedDeps(seedContainer, EventValidator, [
    EventRepository,
    ClassValidator,
  ]);
  registerSeedDeps(seedContainer, EventService, [EventRepository, EventValidator]);

  registerSeedDeps(seedContainer, AssessmentValidator, [
    AssessmentRepository,
    StudentValidator,
    TeacherValidator,
    SectionValidator,
    SubjectValidator,
    ClassValidator,
  ]);
  registerSeedDeps(seedContainer, AssessmentService, [AssessmentRepository, AssessmentValidator]);

  registerSeedDeps(seedContainer, ExamValidator, [
    ExamRepository,
    StudentValidator,
    TeacherValidator,
    SectionValidator,
    SubjectValidator,
  ]);
  registerSeedDeps(seedContainer, ExamService, [ExamRepository, ExamValidator]);

  registerSeedDeps(seedContainer, GradeValidator, [
    GradeRepository,
    StudentValidator,
    TeacherValidator,
    SectionValidator,
    SubjectValidator,
    AssessmentValidator,
  ]);
  registerSeedDeps(seedContainer, GradeService, [GradeRepository, GradeValidator, AssessmentRepository]);

  registerSeedDeps(seedContainer, AlertValidator, [
    AlertRepository,
    StudentRepository,
    TeacherRepository,
    ClassRepository,
    SubjectRepository,
  ]);
  registerSeedDeps(seedContainer, AlertService, [AlertRepository, AlertValidator]);

  registerSeedDeps(seedContainer, DisciplineValidator, [DisciplineRepository]);
  registerSeedDeps(seedContainer, DisciplineService, [DisciplineRepository, DisciplineValidator]);

  registerSeedDeps(seedContainer, BehaviorRewardValidator, [BehaviorRewardRepository]);
  registerSeedDeps(seedContainer, BehaviorRewardService, [BehaviorRewardRepository, BehaviorRewardValidator]);

  registerSeedDeps(seedContainer, StudentRouteValidator, [StudentRouteRepository]);
  registerSeedDeps(seedContainer, StudentRouteService, [
    StudentRouteRepository,
    StudentRouteValidator,
    FeeService,
    FeeTypeRepository,
  ]);

  registerSeedDeps(seedContainer, RefuelValidator, [RefuelRepository]);
  registerSeedDeps(seedContainer, RefuelService, [RefuelRepository, RefuelValidator]);

  registerSeedDeps(seedContainer, MaintenanceValidator, [MaintenanceRepository, VehicleRepository]);
  registerSeedDeps(seedContainer, MaintenanceService, [MaintenanceRepository, MaintenanceValidator]);
}
