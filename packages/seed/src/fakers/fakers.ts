import { faker } from '@faker-js/faker';
import { maleNames, femaleNames, lastNames, streets, cities, conditions, schoolNames, relationshipType, sections, classesData, subjectsData, feeTypeData } from './staticData';


export function shuffle(array) {
  return faker.helpers.shuffle(array);
}

export function integer(min, max) {
  return faker.number.int({ min, max });
}

// ============================================
// PERSONAL INFO GENERATORS
// ============================================

export function gender() {
  return faker.helpers.arrayElement(['M', 'F']);
}

export function firstName(gender) {
  return gender === 'M'
    ? faker.helpers.arrayElement(maleNames)
    : faker.helpers.arrayElement(femaleNames);
}

export function lastName() {
  return faker.helpers.arrayElement(lastNames);
}

export function fullName(gender, lastNameVal = null) {
  const first = firstName(gender);
  const last = lastNameVal || lastName();

  return {
    firstName: first,
    lastName: last,
    fullName: `${first} ${last}`
  };
}

// ============================================
// CONTACT INFO GENERATORS
// ============================================

export function phone() {
  const prefix = Math.random() < 0.9
    ? faker.helpers.arrayElement(['2126', '2127'])
    : '2125';
  return `${prefix}${faker.string.numeric(8)}`;
}

export function email(firstName, lastName) {
  const domains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'live.com', 'icloud.com', 'aol.com',
    'mail.com', 'protonmail.com', 'gmx.com',
    'yandex.com', 'zoho.com', 'web.de', 'free.fr'
  ];

  const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLastName = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const randomSuffixHigh = faker.number.int({ min: 1000, max: 9999 });
  const randomSuffixLow = faker.number.int({ min: 10, max: 999 });
  const year = faker.number.int({ min: 1970, max: 2024 });

  const patterns = [
    `${cleanFirstName}.${cleanLastName}${randomSuffixHigh}`,
    `${cleanFirstName}_${cleanLastName}_${randomSuffixHigh}`,
    `${cleanLastName}.${cleanFirstName}.${randomSuffixLow}`,
    `${cleanFirstName}.${cleanLastName}${year}`,
    `${cleanFirstName.charAt(0)}.${cleanLastName}${randomSuffixHigh}`,
    `${cleanFirstName}${cleanLastName}${randomSuffixHigh}`,
  ];

  const emailPrefix = faker.helpers.arrayElement(patterns);

  return `${emailPrefix}@${faker.helpers.arrayElement(domains)}`;
}

// ============================================
// LOCATION GENERATORS
// ============================================

export function street() {
  return faker.helpers.arrayElement(streets);
}

export function city() {
  return faker.helpers.arrayElement(cities);
}

export function address(streetValue = null, cityValue = null) {
  const selectedStreet = streetValue || street();
  const selectedCity = cityValue || city();
  const number = faker.number.int({ min: 1, max: 500 });
  return `${number}, ${selectedStreet}, ${selectedCity}`;
}

// ============================================
// MOROCCAN ID GENERATORS
// ============================================

export function cin() {
  const letters = faker.string.alpha({ length: 2, casing: 'upper' });
  const numbers = faker.string.numeric(6);
  return `${letters}${numbers}`;
}

export function nationality() {
  return Math.random() < 0.9 ? 'Moroccan' : faker.location.country();
}

// ============================================
// DATE GENERATORS
// ============================================

export function birthdate(minAge, maxAge) {
  return faker.date.birthdate({ min: minAge, max: maxAge, mode: 'age' }).toISOString().split('T')[0];
}

export function parentBirthdate() {
  return birthdate(25, 65);
}

export function studentBirthdate() {
  return birthdate(3, 19);
}

// ============================================
// SCHOOL DATA GENERATORS
// ============================================

export function studentCode() {
  return `STU${faker.string.numeric(6)}`;
}

export function bloodType() {
  return faker.helpers.arrayElement([
    'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'
  ]);
}

export function maritalStatus() {
  const random = Math.random();
  if (random < 0.02) return 'widowed';
  if (random < 0.12) return 'divorced';
  if (random < 0.18) return 'separated';
  if (random < 0.22) return 'single';
  return 'married';
}

export function relationship() {
  return faker.helpers.arrayElement(relationshipType);
}

export function financialResponsibility(): boolean {
  return faker.datatype.boolean();
}

export function createId(prefix, number, padding = 2) {
  const paddedNumber = String(number).padStart(padding, '0');
  return `${prefix}${paddedNumber}`;
}

export function randomClass() {
  return faker.helpers.arrayElement(classesData);
}

export function randomSubject() {
  return faker.helpers.arrayElement(subjectsData);
}

export function randomSectionName() {
  const availableSections = sections.slice(0, 3);
  return faker.helpers.arrayElement(availableSections);
}

export function enrollmentDate(before?: string | Date) {
  // Enrollment must not fall after the academic year it bills for, otherwise
  // FeeService rejects it ("Student was not enrolled in the target academic
  // year"). Callers pass the academic-year end as an upper bound; default to
  // now when unbounded.
  const to = before ? new Date(before) : new Date();
  const from = new Date(to);
  from.setFullYear(from.getFullYear() - 5);
  return faker.date.between({ from, to }).toISOString().split('T')[0];
}

export function medicalConditions() {
  if (Math.random() < 0.2) {
    return faker.helpers.arrayElement(conditions);
  }
  return '';
}

export function previousSchool() {
  if (Math.random() < 0.3) {
    return '';
  }
  return faker.helpers.arrayElement(schoolNames);
}

export function discount() {
  if (Math.random() < 0.7) return 0;
  return faker.number.int({ min: 25, max: 100, }) * 2;
}

export function randomFeeType() {
  return faker.helpers.arrayElement(feeTypeData)
}

export function schedule(paymentType) {
  if (paymentType === 'recurring') {
    const recurringSchedules = ['monthly', 'quarterly', 'semester', 'annually'];
    return faker.helpers.arrayElement(recurringSchedules);
  }
  return 'oneTime';
}

// ============================================
// VEHICLE/DRIVER GENERATORS
// ============================================

export function randomDriver(drivers) {
  if (!drivers || drivers.length === 0) {
    return null;
  }
  //@ts-ignore
  return faker.helpers.arrayElement(drivers)?.id;
}

// ============================================
// TEACHER GENERATORS
// ============================================

export function yearsOfExperience(min = 1, max = 25) {
  return faker.number.int({ min, max });
}

export function teacherSalary(yearsOfExperience, baseSalary = 5400, experienceMultiplier = 200) {
  const experienceBonus = yearsOfExperience * experienceMultiplier;
  const randomBonus = faker.number.int({ min: 0, max: 1500 });
  return baseSalary + experienceBonus + randomBonus;
}

export function teacherHireDate(yearsOfExperience) {
  return faker.date.past({ years: yearsOfExperience }).toISOString().split('T')[0];
}

export function bankAccount() {
  return faker.string.numeric(24);
}

export function teacherSpecialization() {
  return faker.helpers.arrayElement(subjectsData).name;
}


/**
 * ******************************************************
 * EXPENSE HELPER FUNCTIONS
 * ******************************************************
 */

export function invoiceNumber() {
  return `INV-${faker.string.alphanumeric({ length: 3 }).toUpperCase()}-${faker.string.numeric(5)}`;
}

export function receiptNumber() {
  return Math.random() > 0.5 ? `REC-${faker.string.numeric(6)}` : null;
}

export function checkNumber() {
  return Math.random() > 0.7 ? faker.string.numeric(6) : null;
}

export function expenseCategory() {
  const categories = [
    'utilities', 'maintenance', 'supplies', 'equipment',
    'transport', 'food', 'security', 'cleaning', 'insurance',
    'rent', 'tax', 'marketing', 'training', 'technology', 'miscellaneous'
  ];
  return faker.helpers.arrayElement(categories);
}

export function expenseStatus() {
  const statuses = ['pending', 'approved', 'paid', 'rejected', 'cancelled'];
  return faker.helpers.arrayElement(statuses);
}

export function paymentMethod() {
  const methods = ['cash', 'bankTransfer', 'check', 'creditCard', 'debitCard', 'online', 'mobilePayment'];
  return faker.helpers.arrayElement(methods);
}

/** Realistic school expense titles grouped by category */
const SCHOOL_EXPENSE_TITLES: Record<string, string[]> = {
  salary: [
    'Teacher salaries - monthly', 'Administrative staff salaries', 'Security guard salaries',
    'Cleaning staff wages', 'Driver salaries - monthly', 'Cafeteria staff wages',
    'Part-time teacher compensation', 'Overtime pay - staff', 'Substitute teacher pay',
  ],
  utilities: [
    'Electricity bill', 'Water bill', 'Internet & phone service', 'Gas bill',
    'Waste collection service', 'Sewage service',
  ],
  maintenance: [
    'Classroom door repair', 'Plumbing repair - restrooms', 'Electrical wiring fix',
    'AC unit maintenance', 'Roof leak repair', 'Painting - hallway walls',
    'Window replacement - building B', 'Fire extinguisher inspection', 'Playground equipment repair',
    'Elevator maintenance contract', 'Generator servicing',
  ],
  supplies: [
    'Whiteboard markers & erasers', 'Printer paper & toner', 'Cleaning products',
    'Office stationery', 'First aid kit supplies', 'Exam paper printing',
    'Chalk and classroom supplies', 'Hand sanitizer & soap refills', 'Toilet paper & paper towels',
  ],
  equipment: [
    'Desktop computers - lab', 'Projector replacement', 'Printer purchase',
    'Science lab equipment', 'Sports equipment', 'Classroom desks & chairs',
    'Library bookshelves', 'Whiteboard installation', 'CCTV cameras upgrade',
    'PA system speakers', 'Photocopier lease',
  ],
  transport: [
    'School bus fuel', 'Bus insurance premium', 'Vehicle registration renewal',
    'Tire replacement - bus', 'Bus oil change & service', 'Toll fees - field trip',
  ],
  food: [
    'Cafeteria food supplies', 'Drinking water delivery', 'Student snacks - event',
    'Staff kitchen supplies', 'Ramadan iftar provisions',
  ],
  security: [
    'Security camera maintenance', 'Guard uniform purchase', 'Access card system',
    'Night shift security', 'Alarm system subscription',
  ],
  cleaning: [
    'Deep cleaning service', 'Pest control treatment', 'Garden maintenance',
    'Window cleaning service', 'Carpet cleaning',
  ],
  insurance: [
    'Building insurance - annual', 'Student accident insurance', 'Staff health insurance',
    'Vehicle fleet insurance', 'Liability insurance renewal',
  ],
  rent: [
    'Building rent - monthly', 'Sports field rental', 'Warehouse storage rent',
    'Parking lot lease',
  ],
  tax: [
    'Property tax - annual', 'Municipal tax', 'Professional tax',
  ],
  marketing: [
    'School brochure printing', 'Open day event costs', 'Social media advertising',
    'Website hosting & domain', 'Enrollment campaign flyers', 'School banner printing',
  ],
  training: [
    'Teacher training workshop', 'First aid certification course', 'IT skills training - staff',
    'Pedagogical conference fees', 'CPR training session',
  ],
  technology: [
    'Software licenses - annual', 'Antivirus subscription', 'School management system license',
    'Google Workspace subscription', 'WiFi router replacement', 'Server hosting fees',
  ],
  miscellaneous: [
    'National day celebration', 'End-of-year ceremony', 'Student awards & trophies',
    'Parent meeting refreshments', 'Graduation ceremony costs', 'Donation to local charity',
  ],
};

export function expenseTitle(category?: string) {
  if (category && SCHOOL_EXPENSE_TITLES[category]) {
    return faker.helpers.arrayElement(SCHOOL_EXPENSE_TITLES[category]);
  }
  const allTitles = Object.values(SCHOOL_EXPENSE_TITLES).flat();
  return faker.helpers.arrayElement(allTitles);
}

/** Realistic school expense amounts by category (in MAD) */
const EXPENSE_AMOUNT_RANGES: Record<string, { min: number; max: number }> = {
  salary:       { min: 4000,  max: 15000 },
  utilities:    { min: 800,   max: 8000 },
  maintenance:  { min: 500,   max: 12000 },
  supplies:     { min: 200,   max: 3000 },
  equipment:    { min: 1500,  max: 25000 },
  transport:    { min: 500,   max: 6000 },
  food:         { min: 1000,  max: 8000 },
  security:     { min: 1000,  max: 5000 },
  cleaning:     { min: 500,   max: 4000 },
  insurance:    { min: 3000,  max: 20000 },
  rent:         { min: 8000,  max: 35000 },
  tax:          { min: 2000,  max: 15000 },
  marketing:    { min: 500,   max: 5000 },
  training:     { min: 800,   max: 5000 },
  technology:   { min: 500,   max: 8000 },
  miscellaneous:{ min: 300,   max: 5000 },
};

export function expenseAmount(category?: string) {
  const range = (category && EXPENSE_AMOUNT_RANGES[category])
    ? EXPENSE_AMOUNT_RANGES[category]
    : { min: 500, max: 15000 };
  return faker.number.int(range);
}

/**
 * Returns a random date within the academic year (Sep 2025 – current month).
 * If a specific month/year is provided, returns a random day in that month.
 */
export function expenseDate(month?: number, year?: number) {
  if (month !== undefined && year !== undefined) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = faker.number.int({ min: 1, max: lastDay });
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  // Default: random date within Sep 2025 – Apr 2026
  const start = new Date(2025, 8, 1);  // Sep 1
  const end = new Date();               // now
  const date = faker.date.between({ from: start, to: end });
  return date.toISOString().split('T')[0];
}

export function paymentDate(status, referenceDate?: string) {
  if (status === 'paid' || status === 'approved') {
    if (referenceDate) {
      // Pay within 0-10 days after the expense date
      const ref = new Date(referenceDate);
      const offset = faker.number.int({ min: 0, max: 10 });
      ref.setDate(ref.getDate() + offset);
      const today = new Date();
      if (ref > today) return today.toISOString().split('T')[0];
      return ref.toISOString().split('T')[0];
    }
    return faker.date.recent({ days: 30 }).toISOString().split('T')[0];
  }
  return null;
}

const REJECTION_REASONS = [
  'Budget exceeded for this category',
  'Missing supporting invoice',
  'Not approved by department head',
  'Duplicate expense submission',
  'Vendor quote not competitive enough',
  'Outside approved spending period',
  'Incorrect amount — needs revision',
];

export function rejectionReason() {
  return faker.helpers.arrayElement(REJECTION_REASONS);
}

const EXPENSE_NOTES: Record<string, string[]> = {
  salary: ['Includes social security contributions', 'Net after tax deductions', 'Covers holiday bonus'],
  utilities: ['Meter reading verified', 'Higher than usual due to AC usage', 'Paid via direct debit'],
  maintenance: ['Urgent repair — approved by principal', 'Scheduled annual maintenance', 'Warranty covered partial cost'],
  supplies: ['Bulk order for the semester', 'Restocking before exams', 'Monthly replenishment'],
  equipment: ['3-year warranty included', 'Replaces broken unit', 'For new computer lab'],
  transport: ['Covers all school routes', 'Price increase from supplier', 'Includes highway tolls'],
  rent: ['Monthly lease payment', 'Renewed contract at same rate', 'Deposit already paid'],
  insurance: ['Annual premium — full year', 'Covers all enrolled students', 'Policy renewed'],
  default: ['Approved by administration', 'Regular recurring expense', 'Processed on time'],
};

export function expenseNotes(category?: string) {
  if (Math.random() < 0.4) return null;
  const pool = EXPENSE_NOTES[category ?? 'default'] || EXPENSE_NOTES.default;
  return faker.helpers.arrayElement(pool);
}

// Basic utilities
export function occupation(): string {
  return faker.person.jobTitle();
}

export function boolean(): boolean {
  return faker.datatype.boolean();
}

export function randomInt(min: number, max: number): number {
  return faker.number.int({ min, max });
}

export function selectRandomElement<T>(array: T[]): T {
  return faker.helpers.arrayElement(array);
}

export function selectRandomElements<T>(array: T[], count: number): T[] {
  return faker.helpers.arrayElements(array, count);
}

export function numericString(length: number): string {
  return faker.string.numeric(length);
}

export function pastDate(years: number): string {
  return faker.date.past({ years }).toISOString().split('T')[0];
}

export function futureDate(minYears: number, maxYears: number): string {
  const years = faker.number.int({ min: minYears, max: maxYears });
  return faker.date.future({ years }).toISOString().split('T')[0];
}

export function randomSentence(): string {
  return faker.lorem.sentence();
}

export function driverLicenseType(): string {
  const licenseTypes = ['B', 'C', 'D'];
  return selectRandomElement(licenseTypes);
}

export function driverLicenseNumber(): string {
  const licensePrefix = selectRandomElement(['M', 'L', 'D']);
  return `${licensePrefix}${numericString(8)}`;
}

export function driverSalary(yearsOfExperience: number): number {
  const baseSalary = 4200;
  const experienceBonus = yearsOfExperience * 150;
  return baseSalary + experienceBonus + randomInt(0, 800);
}

export function teacherEmploymentType(): string {
  const employmentTypes = ['fullTime', 'partTime', 'contract', 'temporary'];
  return selectRandomElement(employmentTypes);
}

export function teacherAcademicDegree(): string {
  const academicDegreesList = ['Bachelor', 'Master', 'PhD', 'Diploma'];
  return selectRandomElement(academicDegreesList);
}

export function teacherWorkloadHours(): number {
  return randomInt(20, 40);
}

export function getNumberOfChildren(): number {
  const random = Math.random();
  if (random < 0.10) return 3;
  if (random < 0.40) return 2;
  return 1;
}

export function transactionRef(): string {
  return `TXN-${faker.string.alphanumeric({ length: 12 }).toUpperCase()}`;
}

export function pickRandom<T>(items: T[]): T {
   return items[Math.floor(Math.random() * items.length)];
}

export function chance(probability) {
   return Math.random() < probability;
}

export const getSubjectByName = name =>
   subjectsData.find(s => s.name === name);

export function getSubjectsNames() {
   return subjectsData.map(s => s.name);
}
