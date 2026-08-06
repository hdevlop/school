export const ENUMS = {
  // Core System
  userType: {
    values: ['admin', 'teacher', 'student', 'parent'],
    translationKey: 'enums.userType'
  },
  userStatus: {
    values: ['active', 'inactive', 'pending'],
    translationKey: 'enums.userStatus'
  },
  tokenStatus: {
    values: ['active', 'revoked', 'expired'],
    translationKey: 'enums.tokenStatus'
  },
  tokenType: {
    values: ['access', 'refresh'],
    translationKey: 'enums.tokenType'
  },
  fileStatus: {
    values: ['active', 'deleted', 'archived'],
    translationKey: 'enums.fileStatus'
  },

  // Educational System
  gender: {
    values: ['M', 'F'],
    translationKey: 'common.gender'
  },
  studentStatus: {
    values: ['active', 'inactive', 'graduated', 'transferred'],
    translationKey: 'students.status'
  },
  teacherStatus: {
    values: ['active', 'inactive', 'onLeave'],
    translationKey: 'teachers.status',
  },
  employmentType: {
    values: ['fullTime', 'partTime', 'contract', 'temporary'],
    translationKey: 'teachers.employmentType',
  },
  relationshipType: {
    values: ['father', 'mother', 'guardian', 'stepparent', 'grandparent', 'other'],
    translationKey: 'parents.relationships'
  },
  semester: {
    values: ['spring', 'summer', 'fall', 'winter'],
    translationKey: 'academic.semester'
  },
  classStatus: {
    values: ['active', 'completed', 'cancelled'],
    translationKey: 'classes.status'
  },
  sectionStatus: {
    values: ['active', 'inactive', 'archived'],
    translationKey: 'sections.status'
  },
  language: {
    values: ['en', 'fr', 'ar', 'es'],
    translationKey: 'common.languages'
  },
  enrollmentStatus: {
    values: ['enrolled', 'completed', 'dropped', 'failed'],
    translationKey: 'enrollments.status'
  },
  assignmentStatus: {
    values: ['active', 'completed', 'cancelled'],
    translationKey: 'assignments.status'
  },

  calendarSystem: {
    values: ['SEMESTER', 'TRIMESTER', 'QUARTER'],
    translationKey: 'settings.calendarSystem'
  },

  // Assessment & Exams
  assessmentType: {
    values: ['quiz', 'assignment', 'project', 'participation', 'test', 'presentation'],
    translationKey: 'assessments.type'
  },
  assessmentStatus: {
    values: ['scheduled', 'active', 'completed', 'cancelled'],
    translationKey: 'assessments.status'
  },
  submissionType: {
    values: ['online', 'paper', 'presentation', 'practical', 'discussion'],
    translationKey: 'assessments.submissionType'
  },
  examType: {
    values: ['midterm', 'final', 'standardized'],
    translationKey: 'exams.type'
  },
  examSecurity: {
    values: ['low', 'medium', 'high'],
    translationKey: 'exams.security'
  },
  examStatus: {
    values: ['scheduled', 'active', 'completed', 'cancelled', 'rescheduled'],
    translationKey: 'exams.status'
  },
  gradeStatus: {
    values: ['pending', 'graded', 'missed'],
    translationKey: 'grades.status'
  },
  attendanceStatus: {
    values: ['present', 'absent', 'late'],
    translationKey: 'attendance.status'
  },
  proficiencyLevel: {
    values: ['beginner', 'intermediate', 'advanced', 'expert'],
    translationKey: 'common.proficiencyLevel'
  },
  dayOfWeek: {
    values: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    translationKey: 'common.days'
  },

  // Alerts
  alertType: {
    values: ['academic', 'attendance', 'behavioral', 'health', 'system', 'announcement', 'reminder', 'emergency'],
    translationKey: 'alerts.type'
  },
  alertPriority: {
    values: ['low', 'medium', 'high', 'critical'],
    translationKey: 'alerts.priority'
  },
  alertStatus: {
    values: ['active', 'acknowledged', 'resolved', 'dismissed'],
    translationKey: 'alerts.status'
  },
  disciplineCategory: {
    values: ['classroom_disruption', 'disrespect', 'bullying', 'fighting', 'cheating', 'vandalism', 'uniform_violation', 'device_misuse', 'prohibited_item', 'other'],
    translationKey: 'discipline.categories'
  },
  disciplineSeverity: {
    values: ['low', 'medium', 'high', 'critical'],
    translationKey: 'discipline.severity'
  },
  disciplineStatus: {
    values: ['open', 'resolved'],
    translationKey: 'discipline.status'
  },
  disciplineAction: {
    values: ['verbal_warning', 'written_warning', 'detention', 'counseling', 'parent_meeting', 'suspension', 'other'],
    translationKey: 'discipline.actions'
  },

  // Fees & Payments
  feeTypeStatus: {
    values: ['active', 'inactive', 'archived'],
    translationKey: 'fees.typeStatus'
  },
  feeCategory: {
    values: ['tuition', 'registration', 'transport', 'cafeteria', 'books', 'sports', 'uniform', 'technology', 'fieldtrip', 'other'],
    translationKey: 'feeTypes.category'
  },
  paymentType: {
    values: ['recurring', 'oneTime'],
    translationKey: 'payments.type',
  },
  schedule: {
    values: ['monthly', 'quarterly', 'semester', 'annually', 'oneTime'],
    translationKey: 'fees.schedule',
  },
  feeStatus: {
    values: ['pending', 'partiallyPaid', 'paid', 'overdue'],
    translationKey: 'fees.status',
  },
  feeInstallmentStatus: {
    values: ['pending', 'partiallyPaid', 'paid', 'overdue', 'cancelled'],
    translationKey: 'fees.installmentStatus',
  },
  paymentMethod: {
    values: ['cash', 'bankTransfer', 'check', 'creditCard', 'debitCard', 'online', 'mobilePayment'],
    translationKey: 'payments.methods',
  },
  
  paymentStatus: {
    values: ['completed', 'pending', 'failed', 'refunded'],
    translationKey: 'payments.status'
  },

  // Events
  eventType: {
    values: ['academic', 'sports', 'cultural', 'holiday', 'exam', 'meeting', 'workshop', 'fieldtrip', 'ceremony', 'conference', 'other'],
    translationKey: 'events.type'
  },
  eventStatus: {
    values: ['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'],
    translationKey: 'events.status'
  },
  eventVisibility: {
    values: ['public', 'private', 'teachers', 'students', 'parents', 'staff'],
    translationKey: 'events.visibility'
  },
  participantType: {
    values: ['student', 'teacher', 'parent', 'staff'],
    translationKey: 'events.participantType'
  },

  // Expenses
  expenseCategory: {
    values: ['utilities', 'maintenance', 'supplies', 'equipment', 'transport', 'food', 'security', 'cleaning', 'insurance', 'rent', 'tax', 'marketing', 'training', 'technology', 'miscellaneous'],
    translationKey: 'expenses.categories'
  },
  expenseStatus: {
    values: ['pending', 'approved', 'paid', 'rejected', 'cancelled'],
    translationKey: 'expenses.status'
  },

  // Tracker
  trackerMode: {
    values: ['tracking', 'gprs', 'sms', 'sleepTime', 'sleepShock', 'sleepDeep'],
    translationKey: 'tracker.mode',
  },

  // Transport
  driverStatus: {
    values: ['active', 'inactive', 'onLeave', 'suspended'],
    translationKey: 'transport.driverStatus',
  },
  vehicleStatus: {
    values: ['active', 'inactive', 'maintenance', 'retired'],
    translationKey: 'transport.vehicleStatus'
  },
  vehicleType: {
    values: ['sedan', 'minibus', 'fullbus', 'shuttle'],
    translationKey: 'transport.vehicleType'
  },
  vehicleDocumentType: {
    values: ['insurance', 'registration', 'inspection', 'emission', 'license'],
    translationKey: 'transport.documentType'
  },
  busStatus: {
    values: ['active', 'inactive', 'maintenance', 'retired'],
    translationKey: 'transport.busStatus'
  },
  refuelStatus: {
    values: ['pending', 'completed', 'cancelled'],
    translationKey: 'transport.refuelStatus'
  },
  fuelType: {
    values: ['gasoline', 'diesel', 'electric', 'hybrid', 'lpg', 'cng'],
    translationKey: 'transport.fuelType'
  },
  maintenanceType: {
    values: ['scheduled', 'repair', 'inspection', 'oilChange', 'filterChange', 'other'],
    translationKey: 'transport.maintenanceType',
  },
  maintenanceStatus: {
    values: ['scheduled', 'inProgress', 'completed', 'cancelled', 'overdue'],
    translationKey: 'transport.maintenanceStatus',
  },

  // Personal
  maritalStatus: {
    values: ['single', 'married', 'divorced', 'widowed', 'separated'],
    translationKey: 'parents.maritalStatus'
  }
}

// Helper functions
export const getEnumConfig = (enumKey) => ENUMS[enumKey]
export const getEnumValues = (enumKey) => ENUMS[enumKey]?.values || []
