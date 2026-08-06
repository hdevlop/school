// lib/validations/enums.js
import { z } from 'zod'
import { ENUMS } from './ENUMS'

const createZodEnum = (enumKey) => {
  const values = ENUMS[enumKey]?.values
  if (!values) throw new Error(`Enum ${enumKey} not found`)
  return z.enum(values)
}

// Core System
export const userTypeEnum = createZodEnum('userType')
export const userStatusEnum = createZodEnum('userStatus')
export const tokenStatusEnum = createZodEnum('tokenStatus')
export const tokenTypeEnum = createZodEnum('tokenType')
export const fileStatusEnum = createZodEnum('fileStatus')

// Educational System
export const genderEnum = createZodEnum('gender')
export const studentStatusEnum = createZodEnum('studentStatus')
export const teacherStatusEnum = createZodEnum('teacherStatus')
export const employmentTypeEnum = createZodEnum('employmentType')
export const relationshipTypeEnum = createZodEnum('relationshipType')
export const semesterEnum = createZodEnum('semester')
export const classStatusEnum = createZodEnum('classStatus')
export const sectionStatusEnum = createZodEnum('sectionStatus')
export const languageEnum = createZodEnum('language')
export const enrollmentStatusEnum = createZodEnum('enrollmentStatus')
export const assignmentStatusEnum = createZodEnum('assignmentStatus')
export const calendarSystemEnum = createZodEnum('calendarSystem')

// Assessment & Exams
export const assessmentTypeEnum = createZodEnum('assessmentType')
export const assessmentStatusEnum = createZodEnum('assessmentStatus')
export const submissionTypeEnum = createZodEnum('submissionType')
export const examTypeEnum = createZodEnum('examType')
export const examSecurityEnum = createZodEnum('examSecurity')
export const examStatusEnum = createZodEnum('examStatus')
export const gradeStatusEnum = createZodEnum('gradeStatus')
export const attendanceStatusEnum = createZodEnum('attendanceStatus')
export const proficiencyLevelEnum = createZodEnum('proficiencyLevel')
export const dayOfWeekEnum = createZodEnum('dayOfWeek')

// Alerts
export const alertTypeEnum = createZodEnum('alertType')
export const alertPriorityEnum = createZodEnum('alertPriority')
export const alertStatusEnum = createZodEnum('alertStatus')

// Discipline
export const disciplineCategoryEnum = createZodEnum('disciplineCategory')
export const disciplineSeverityEnum = createZodEnum('disciplineSeverity')
export const disciplineStatusEnum = createZodEnum('disciplineStatus')
export const disciplineActionEnum = createZodEnum('disciplineAction')

// Fees & Payments
export const feeTypeStatusEnum = createZodEnum('feeTypeStatus')
export const paymentTypeEnum = createZodEnum('paymentType')
export const scheduleEnum = createZodEnum('schedule')
export const feeStatusEnum = createZodEnum('feeStatus')
export const feeInstallmentStatusEnum = createZodEnum('feeInstallmentStatus')
export const paymentMethodEnum = createZodEnum('paymentMethod')
export const paymentStatusEnum = createZodEnum('paymentStatus')

// Events
export const eventTypeEnum = createZodEnum('eventType')
export const eventStatusEnum = createZodEnum('eventStatus')
export const eventVisibilityEnum = createZodEnum('eventVisibility')
export const participantTypeEnum = createZodEnum('participantType')

// Expenses
export const expenseCategoryEnum = createZodEnum('expenseCategory')
export const expenseStatusEnum = createZodEnum('expenseStatus')

// Tracker
export const trackerModeEnum = createZodEnum('trackerMode')

// Transport
export const driverStatusEnum = createZodEnum('driverStatus')
export const vehicleStatusEnum = createZodEnum('vehicleStatus')
export const vehicleTypeEnum = createZodEnum('vehicleType')
export const vehicleDocumentTypeEnum = createZodEnum('vehicleDocumentType')
export const busStatusEnum = createZodEnum('busStatus')
export const refuelStatusEnum = createZodEnum('refuelStatus')
export const fuelTypeEnum = createZodEnum('fuelType')
export const maintenanceTypeEnum = createZodEnum('maintenanceType')
export const maintenanceStatusEnum = createZodEnum('maintenanceStatus')

// Personal
export const maritalStatusEnum = createZodEnum('maritalStatus')
