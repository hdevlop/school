import { z } from 'zod';

import { enumValues, type EnumKey } from '@sms/contracts/lookup';

/**
 * Zod adapter over the shared domain values.
 *
 * The literals themselves live in `@sms/contracts`, which the dashboard reads
 * too — this module only dresses them as Zod enums for DTO validation and
 * hands Drizzle the tuple shape its `pgEnum` builder wants. Nothing is
 * redeclared here, so the server and the browser cannot disagree about what
 * the API accepts.
 */
export { enumValues, type EnumKey };
export * from '@sms/contracts';

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
