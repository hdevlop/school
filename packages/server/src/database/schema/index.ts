export {
  credentialSetupRequirementsTable as credentialSetupRequirements,
  credentialSetupSessionsTable as credentialSetupSessions,
  permissionsTable as permissions,
  rolePermissionsTable as rolePermissions,
  rolesTable as roles,
  tokenStatusEnum,
  tokenTypeEnum,
  tokensTable as tokens,
  userStatusEnum,
  usersTable as users,
} from '../../auth';

export * from '../shared';

export { auditLogs } from './coreSchema';
export { offlineSnapshots } from '../../modules/offline/OfflineSchema';

export {
  najmThemeAppearance,
  najmThemeBranding,
  najmThemePresets,
} from 'najm-theme/pg';

export { classes, classRef } from '../../modules/classes/classSchema';
export { cycles, cycleRef } from '../../modules/cycles/cycleSchema';
export { subjects, subjectRef } from '../../modules/subjects/subjectSchema';
export { settings, calendarSystemEnum, languageEnum } from '../../modules/settings/settingSchema';
export { academicYears } from '../../modules/academicYears/AcademicYearSchema';
export { academicYearTransitionRuns } from '../../modules/academicYearTransitions/AcademicYearTransitionSchema';
export { academicYearMigrationIssues } from '../../modules/academicYearMigrationIssues/AcademicYearMigrationIssueSchema';
export { studentEnrollments, studentEnrollmentPlacements } from '../../modules/studentEnrollments/StudentEnrollmentSchema';
export {
  feeTypes,
  feeTypeRef,
  feeTypeStatusEnum,
  paymentTypeEnum,
} from '../../modules/financial/feeTypes/feeTypeSchema';
export {
  expenses,
  expenseCategoryEnum,
  expenseStatusEnum,
} from '../../modules/financial/expenses/expenseSchema';
export {
  vehicles,
  vehicleStatusEnum,
  vehicleTypeEnum,
  vehicleDocumentTypeEnum,
  busStatusEnum,
} from '../../modules/transport/vehicles/vehicleSchema';

export {
  sections,
  sectionRef,
  sectionStatusEnum,
} from '../../modules/sections/sectionSchema';
export {
  parents,
  parentRef,
  relationshipTypeEnum,
  maritalStatusEnum,
} from '../../modules/parents/parentSchema';
export { drivers } from '../../modules/transport/drivers/driverSchema';

export {
  students,
  studentParents,
  studentRef,
  studentStatusEnum,
} from '../../modules/students/studentSchema';
export {
  staff,
  staffRef,
  staffStatusEnum,
  shiftEnum,
  compensationModeEnum,
} from '../../modules/staff/staffSchema';
export { staffRoles } from '../../modules/staff/staffRoleSchema';
export {
  zones,
  zoneRef,
  staffCredentials,
  cleanerAssignments,
  assistantAssignments,
  accountantAssignments,
  securityAssignments,
  busAssistantAssignments,
} from '../../modules/staff/staffAssignmentSchema';
export {
  teachers,
  teacherAssignments,
  teacherRef,
  teacherAssignmentRef,
} from '../../modules/teachers/teacherSchema';
export {
  routinePeriods,
  routinePeriodRef,
  routineSchedules,
  routineScheduleRef,
  routineEntries,
  routineDuties,
  routineStatusEnum,
  routineDayEnum,
} from '../../modules/classRoutines/ClassRoutineSchema';

export {
  fees,
  feeInstallments,
  feeRef,
  feeInstallmentRef,
  scheduleEnum,
  feeStatusEnum,
  feeInstallmentStatusEnum,
} from '../../modules/financial/fees/feeSchema';
export {
  payments,
  paymentRef,
  paymentStatusEnum,
} from '../../modules/financial/payments/paymentSchema';
export {
  payslips,
  payslipRef,
  payslipStatusEnum,
} from '../../modules/financial/payroll/payrollSchema';
export { attendance, attendanceHistory } from '../../modules/attendance/attendanceSchema';
export { attendanceTypeEnum } from '../shared';
export {
  assessments,
  assessmentRef,
  assessmentTypeEnum,
  assessmentStatusEnum,
  submissionTypeEnum,
} from '../../modules/assessments/assessmentSchema';
export {
  exams,
  examRef,
  examTypeEnum,
  examStatusEnum,
  examSecurityEnum,
} from '../../modules/exams/examSchema';
export {
  alerts,
  alertTypeEnum,
  alertPriorityEnum,
  alertStatusEnum,
} from '../../modules/alerts/alertSchema';
export { announcements } from '../../modules/announcements/announcementSchema';
export {
  behaviorRewards,
  behaviorRewardCategoryDbEnum,
  behaviorRecognitionLevelDbEnum,
  behaviorRewardTypeDbEnum,
} from '../../modules/behaviorRewards/behaviorRewardSchema';
export {
  disciplineIncidents,
  disciplineCategoryEnum,
  disciplineSeverityEnum,
  disciplineStatusEnum,
  disciplineActionEnum,
} from '../../modules/discipline/disciplineSchema';
export {
  events,
  eventParticipants,
  eventRef,
  eventTypeEnum,
  eventStatusEnum,
  eventVisibilityEnum,
  participantTypeEnum,
} from '../../modules/events/eventSchema';
export {
  vehicleAssignments,
  assignmentStatusEnum,
} from '../../modules/transport/vehicleAssignments/vehicleAssignmentSchema';
export {
  studentRoutes,
  studentRouteStatusEnum,
} from '../../modules/transport/studentRoutes/studentRouteSchema';
export {
  refuels,
  fuelTypeEnum,
  refuelStatusEnum,
} from '../../modules/transport/refuels/refuelSchema';
export {
  maintenance,
  maintenanceTypeEnum,
  maintenanceStatusEnum,
} from '../../modules/transport/maintenance/maintenanceSchema';

export { grades, gradeStatusEnum } from '../../modules/grades/gradeSchema';
export { paymentAllocations } from '../../modules/financial/allocations/allocationSchema';
export {
  studentCreditLots,
  studentCreditApplications,
} from '../../modules/financial/credits/creditSchema';
export { financialAuditLogs } from '../../modules/financial/auditLog/auditLogSchema';
export {
  financialNotificationDeliveries,
} from '../../modules/financial/notifications/notificationSchema';
export {
  notifications,
  notificationDeliveries,
  pushSubscriptions,
} from '../../modules/notifications/notificationSchema';
export {
  rolloverRuns,
  rolloverRunItems,
  rolloverRunStatusEnum,
} from '../../modules/financial/rollover/rolloverSchema';
export { schoolLanding } from '../../modules/landing/LandingSchema';
export { examPlanning } from '../../modules/examPlanning/ExamPlanningSchema';
export { visitRequests, visitRequestStatusEnum } from '../../modules/visitRequests/VisitRequestSchema';
// Chatbot settings and sessions belong to najm-chatbot; RAG tables come
// from najm-rag below.
export {
  aiSettingsTable as aiSettings,
  chatSessionsTable as chatSessions,
} from 'najm-chatbot/pg';
export {
  chatbotToolEmbeddingsTable as chatbotToolEmbeddings,
  chatbotToolSemanticsTable as chatbotToolSemantics,
  chatbotRoutingSettingsTable as chatbotRoutingSettings,
  chatbotDocumentSourcesTable as chatbotDocumentSources,
  chatbotDocumentChunksTable as chatbotDocumentChunks,
  chatbotDocumentEmbeddingsTable as chatbotDocumentEmbeddings,
  chatbotStudioAuditLogsTable as chatbotStudioAuditLogs,
  chatbotUnmatchedQueriesTable as chatbotUnmatchedQueries,
} from 'najm-rag/pg';
