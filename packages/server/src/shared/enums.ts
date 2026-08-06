import { z } from 'zod';

export const enumValues = {
  userType: ['admin', 'teacher', 'student', 'parent'],
  userStatus: ['active', 'inactive', 'pending'],
  tokenStatus: ['active', 'revoked', 'expired'],
  tokenType: ['access', 'refresh'],
  fileStatus: ['active', 'deleted', 'archived'],
  gender: ['M', 'F'],
  studentStatus: ['active', 'inactive', 'graduated', 'transferred'],
  teacherStatus: ['active', 'inactive', 'onLeave'],
  employmentType: ['fullTime', 'partTime', 'contract', 'temporary'],
  relationshipType: ['father', 'mother', 'guardian', 'stepparent', 'grandparent', 'other'],
  semester: ['spring', 'summer', 'fall', 'winter'],
  classStatus: ['active', 'completed', 'cancelled'],
  sectionStatus: ['active', 'inactive', 'archived'],
  language: ['en', 'fr', 'ar', 'es'],
  enrollmentStatus: ['enrolled', 'completed', 'dropped', 'failed'],
  assignmentStatus: ['active', 'completed', 'cancelled'],
  calendarSystem: ['SEMESTER', 'TRIMESTER', 'QUARTER'],
  assessmentType: ['quiz', 'assignment', 'project', 'participation', 'test', 'presentation'],
  assessmentStatus: ['scheduled', 'active', 'completed', 'cancelled'],
  submissionType: ['online', 'paper', 'presentation', 'practical', 'discussion'],
  examType: ['midterm', 'final', 'standardized'],
  examSecurity: ['low', 'medium', 'high'],
  examStatus: ['scheduled', 'active', 'completed', 'cancelled', 'rescheduled'],
  gradeStatus: ['pending', 'graded', 'missed'],
  attendanceStatus: ['present', 'absent', 'late'],
  attendanceType: ['student', 'staff'],
  proficiencyLevel: ['beginner', 'intermediate', 'advanced', 'expert'],
  dayOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  alertType: ['academic', 'attendance', 'behavioral', 'health', 'system', 'announcement', 'reminder', 'emergency'],
  alertPriority: ['low', 'medium', 'high', 'critical'],
  alertStatus: ['active', 'acknowledged', 'resolved', 'dismissed'],
  behaviorRewardCategory: ['academic_effort', 'improvement', 'respect', 'helpfulness', 'leadership', 'teamwork', 'responsibility', 'community_service', 'excellent_attendance', 'other'],
  behaviorRecognitionLevel: ['appreciation', 'achievement', 'excellence'],
  behaviorRewardType: ['verbal_praise', 'written_praise', 'merit', 'badge', 'certificate', 'privilege', 'prize', 'other'],
  disciplineCategory: ['classroom_disruption', 'disrespect', 'bullying', 'fighting', 'cheating', 'vandalism', 'uniform_violation', 'device_misuse', 'prohibited_item', 'other'],
  disciplineSeverity: ['low', 'medium', 'high', 'critical'],
  disciplineStatus: ['open', 'resolved'],
  disciplineAction: ['verbal_warning', 'written_warning', 'detention', 'counseling', 'parent_meeting', 'suspension', 'other'],
  feeTypeStatus: ['active', 'inactive', 'archived'],
  feeCategory: ['tuition', 'registration', 'transport', 'cafeteria', 'books', 'sports', 'uniform', 'technology', 'fieldtrip', 'other'],
  paymentType: ['recurring', 'oneTime'],
  schedule: ['monthly', 'quarterly', 'semester', 'annually', 'oneTime'],
  feeStatus: ['pending', 'partiallyPaid', 'paid', 'overdue'],
  feeInstallmentStatus: ['pending', 'partiallyPaid', 'paid', 'overdue', 'cancelled'],
  paymentMethod: ['cash', 'bankTransfer', 'check', 'creditCard', 'debitCard', 'online', 'mobilePayment'],
  paymentStatus: ['completed', 'pending', 'deposited', 'bounced', 'failed', 'refunded', 'voided'],
  eventType: ['academic', 'sports', 'cultural', 'holiday', 'exam', 'meeting', 'workshop', 'fieldtrip', 'ceremony', 'conference', 'other'],
  eventStatus: ['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'],
  eventVisibility: ['public', 'private', 'teachers', 'students', 'parents', 'staff'],
  participantType: ['student', 'teacher', 'parent', 'staff'],
  expenseCategory: ['utilities', 'maintenance', 'supplies', 'equipment', 'transport', 'food', 'security', 'cleaning', 'insurance', 'rent', 'tax', 'marketing', 'training', 'technology', 'miscellaneous'],
  expenseStatus: ['pending', 'approved', 'paid', 'rejected', 'cancelled'],
  payslipStatus: ['pending', 'paid', 'cancelled'],
  trackerMode: ['tracking', 'gprs', 'sms', 'sleepTime', 'sleepShock', 'sleepDeep'],
  driverStatus: ['active', 'inactive', 'onLeave', 'suspended'],
  staffRole: ['teacher', 'driver', 'principal', 'secretary', 'receptionist', 'accountant', 'cleaner', 'security', 'librarian', 'itSupport', 'busAssistant', 'assistant', 'other'],
  staffStatus: ['active', 'inactive', 'onLeave', 'suspended', 'terminated'],
  shift: ['morning', 'afternoon', 'evening', 'fullDay'],
  compensationMode: ['monthly', 'hourly'],
  vehicleStatus: ['active', 'inactive', 'maintenance', 'retired'],
  vehicleType: ['sedan', 'minibus', 'fullbus', 'shuttle'],
  vehicleDocumentType: ['insurance', 'registration', 'inspection', 'emission', 'license'],
  busStatus: ['active', 'inactive', 'maintenance', 'retired'],
  refuelStatus: ['pending', 'completed', 'cancelled'],
  fuelType: ['gasoline', 'diesel', 'electric', 'hybrid', 'lpg', 'cng'],
  maintenanceType: ['scheduled', 'repair', 'inspection', 'oilChange', 'filterChange', 'other'],
  maintenanceStatus: ['scheduled', 'inProgress', 'completed', 'cancelled', 'overdue'],
  maritalStatus: ['single', 'married', 'divorced', 'widowed', 'separated'],
  llmProvider: ['anthropic', 'openai', 'google', 'zai', 'ollama', 'custom'],
} as const;

export type EnumKey = keyof typeof enumValues;

export const getEnumValues = (enumKey: EnumKey) => enumValues[enumKey] as unknown as [string, ...string[]];

const createZodEnum = (enumKey: EnumKey) => z.enum(getEnumValues(enumKey));

export const userTypeEnum = createZodEnum('userType');
export const userStatusEnum = createZodEnum('userStatus');
export const tokenStatusEnum = createZodEnum('tokenStatus');
export const tokenTypeEnum = createZodEnum('tokenType');
export const fileStatusEnum = createZodEnum('fileStatus');

export const genderEnum = createZodEnum('gender');
export const studentStatusEnum = createZodEnum('studentStatus');
export const teacherStatusEnum = createZodEnum('teacherStatus');
export const employmentTypeEnum = createZodEnum('employmentType');
export const relationshipTypeEnum = createZodEnum('relationshipType');
export const semesterEnum = createZodEnum('semester');
export const classStatusEnum = createZodEnum('classStatus');
export const sectionStatusEnum = createZodEnum('sectionStatus');
export const languageEnum = createZodEnum('language');
export const enrollmentStatusEnum = createZodEnum('enrollmentStatus');
export const assignmentStatusEnum = createZodEnum('assignmentStatus');
export const calendarSystemEnum = createZodEnum('calendarSystem');

export const assessmentTypeEnum = createZodEnum('assessmentType');
export const assessmentStatusEnum = createZodEnum('assessmentStatus');
export const submissionTypeEnum = createZodEnum('submissionType');
export const examTypeEnum = createZodEnum('examType');
export const examSecurityEnum = createZodEnum('examSecurity');
export const examStatusEnum = createZodEnum('examStatus');
export const gradeStatusEnum = createZodEnum('gradeStatus');
export const attendanceStatusEnum = createZodEnum('attendanceStatus');
export const attendanceTypeEnum = createZodEnum('attendanceType');
export const proficiencyLevelEnum = createZodEnum('proficiencyLevel');
export const dayOfWeekEnum = createZodEnum('dayOfWeek');

export const alertTypeEnum = createZodEnum('alertType');
export const alertPriorityEnum = createZodEnum('alertPriority');
export const alertStatusEnum = createZodEnum('alertStatus');
export const behaviorRewardCategoryEnum = createZodEnum('behaviorRewardCategory');
export const behaviorRecognitionLevelEnum = createZodEnum('behaviorRecognitionLevel');
export const behaviorRewardTypeEnum = createZodEnum('behaviorRewardType');

export const disciplineCategoryEnum = createZodEnum('disciplineCategory');
export const disciplineSeverityEnum = createZodEnum('disciplineSeverity');
export const disciplineStatusEnum = createZodEnum('disciplineStatus');
export const disciplineActionEnum = createZodEnum('disciplineAction');

export const feeTypeStatusEnum = createZodEnum('feeTypeStatus');
export const paymentTypeEnum = createZodEnum('paymentType');
export const scheduleEnum = createZodEnum('schedule');
export const feeStatusEnum = createZodEnum('feeStatus');
export const feeInstallmentStatusEnum = createZodEnum('feeInstallmentStatus');
export const paymentMethodEnum = createZodEnum('paymentMethod');
export const paymentStatusEnum = createZodEnum('paymentStatus');

export const eventTypeEnum = createZodEnum('eventType');
export const eventStatusEnum = createZodEnum('eventStatus');
export const eventVisibilityEnum = createZodEnum('eventVisibility');
export const participantTypeEnum = createZodEnum('participantType');

export const expenseCategoryEnum = createZodEnum('expenseCategory');
export const expenseStatusEnum = createZodEnum('expenseStatus');
export const payslipStatusEnum = createZodEnum('payslipStatus');

export const trackerModeEnum = createZodEnum('trackerMode');

export const driverStatusEnum = createZodEnum('driverStatus');
export const staffRoleEnum = createZodEnum('staffRole');
export const staffStatusEnum = createZodEnum('staffStatus');
export const shiftEnum = createZodEnum('shift');
export const compensationModeEnum = createZodEnum('compensationMode');
export const vehicleStatusEnum = createZodEnum('vehicleStatus');
export const vehicleTypeEnum = createZodEnum('vehicleType');
export const vehicleDocumentTypeEnum = createZodEnum('vehicleDocumentType');
export const busStatusEnum = createZodEnum('busStatus');
export const refuelStatusEnum = createZodEnum('refuelStatus');
export const fuelTypeEnum = createZodEnum('fuelType');
export const maintenanceTypeEnum = createZodEnum('maintenanceType');
export const maintenanceStatusEnum = createZodEnum('maintenanceStatus');

export const maritalStatusEnum = createZodEnum('maritalStatus');
export const llmProviderEnum = createZodEnum('llmProvider');
