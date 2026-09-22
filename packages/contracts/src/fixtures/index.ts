/**
 * Fake-but-plausible School records, shared by demo seeding and the
 * dashboard's development form fill.
 *
 * Pure generators over static reference data: no database, filesystem,
 * environment or CLI code, so the same module runs in a Bun seed command and
 * in a browser. Imported only through `@sms/contracts/fixtures` — never from
 * the root barrel, which production UI code loads.
 */
export {
   generateParent,
   generateParents,
   generateStudent,
   generateTeacher,
   generateTeachers,
   generateDriver,
   generateVehicle,
   generateFamilyUnit,
   generateFee,
   generateFees,
   generateFeeStatus,
   generateExpense,
   generateExpenses,
   generateAnnouncement,
   generateEvent,
   generateExam,
   generateAssessment,
   generateClass,
   generateSection,
   generateSubject,
   generateFeeType,
   generateReceiptNumber,
   generateTransactionRef,
   generateInvoiceNumber,
   generatePaymentRef,
   generateCheckNumber,
   generateAllocationRef,
   getClassByName,
   getSectionsByClass,
   TUITION_FEE_TYPE,
   TRANSPORT_FEE_TYPE,
   CAFETERIA_FEE_TYPE,
   REGISTRATION_FEE_TYPE,
   UNIFORM_FEE_TYPE,
   BOOKS_FEE_TYPE,
   SPORTS_FEE_TYPE,
   TECHNOLOGY_FEE_TYPE,
   FIELD_TRIP_FEE_TYPE,
   INITIAL_FEE_TYPES,
   OPTIONAL_FEE_TYPES
} from './entities';

export {
   lastNames,
   femaleNames,
   maleNames,
   sections,
   streets,
   cities,
   conditions,
   schoolNames,
   relationshipType,
   maritalStatusArr,
   SCHEDULES,
   classesData,
   sectionsData,
   subjectsData,
   feeTypeData,
   vehiclesData,
} from './staticData';

export * as fake from './fakers';
export { chance, getNumberOfChildren, pickRandom } from './fakers';
