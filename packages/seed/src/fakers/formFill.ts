import * as fake from './fakers';
import {
  generateAnnouncement,
  generateAssessment,
  generateClass,
  generateDriver,
  generateEvent,
  generateExam,
  generateExpense,
  generateFeeType,
  generateParent,
  generateSection,
  generateStudent,
  generateSubject,
  generateTeacher,
  generateVehicle,
} from './entities';

export type FormFillOverride = unknown | ((key: string) => unknown);
export type FormFillOverrides = Record<string, FormFillOverride>;

type FormDomain =
  | 'announcement'
  | 'assessment'
  | 'class'
  | 'driver'
  | 'event'
  | 'exam'
  | 'expense'
  | 'feeType'
  | 'parent'
  | 'section'
  | 'student'
  | 'subject'
  | 'teacher'
  | 'vehicle'
  | 'generic';

const pad = (value: number) => String(value).padStart(2, '0');

const dateInput = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const futureDate = (days = 14) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateInput(date);
};

export const pick = <T,>(items: readonly T[]): T | undefined =>
  items.length ? items[fake.randomInt(0, items.length - 1)] : undefined;

const WORDS = ['Atlas', 'Anfa', 'Andalus', 'Ifrane', 'Maarifa', 'Mansour', 'Qods', 'Rif'];
const word = () => pick(WORDS)!;

const generic = {
  title: () => `${word()} ${word()} ${fake.randomInt(1, 99)}`,
  sentence: () => fake.randomSentence(),
  paragraph: () => `${fake.randomSentence()} ${fake.randomSentence()}`,
  date: () => dateInput(),
  future: (days?: number) => futureDate(days),
  time: () => `${pad(fake.randomInt(8, 17))}:${pad(pick([0, 15, 30, 45])!)}`,
  academicYear: () => {
    const year = new Date().getFullYear();
    return `${year}-${year + 1}`;
  },
  url: () => `https://example.com/${word().toLowerCase()}`,
  code: () => `${word().slice(0, 3).toUpperCase()}${fake.randomInt(10, 99)}`,
};

const schemaKind = (schema: any): string | undefined =>
  schema?._def?.typeName ?? schema?._def?.type ?? schema?.type;

const unwrap = (type: any): any => {
  const seen = new Set<any>();
  let current = type;

  for (let index = 0; index < 10 && current && !seen.has(current); index++) {
    seen.add(current);
    const definition = current._def;
    const kind = schemaKind(current);
    const inner =
      definition?.innerType ??
      definition?.schema ??
      (kind === 'pipe' || kind === 'ZodPipeline' ? definition?.out ?? definition?.in : undefined);

    if (!inner) break;
    current = inner;
  }

  return current;
};

const enumValuesFrom = (value: any): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  if (typeof value === 'object') {
    const values = Object.values(value);
    const strings = values.filter((entry) => typeof entry === 'string');
    return strings.length ? strings : values;
  }
  return [];
};

const getEnumValues = (type: any): any[] | null => {
  const current = unwrap(type);
  const definition = current?._def;
  const kind = schemaKind(current);

  if (kind === 'ZodLiteral' || kind === 'literal') {
    const values = enumValuesFrom(definition?.values);
    return values.length ? values : [definition?.value].filter((value) => value !== undefined);
  }

  if (kind !== 'ZodEnum' && kind !== 'ZodNativeEnum' && kind !== 'enum') return null;

  const values = [
    enumValuesFrom(current?.options),
    enumValuesFrom(definition?.entries),
    enumValuesFrom(definition?.values),
  ].find((candidate) => candidate.length) ?? [];

  return values.length ? values : null;
};

const isBoolean = (type: any) => {
  const kind = schemaKind(unwrap(type));
  return kind === 'ZodBoolean' || kind === 'boolean';
};

const getObjectShape = (schema: any): Record<string, any> | null => {
  const current = unwrap(schema);
  const kind = schemaKind(current);
  if (kind !== 'ZodObject' && kind !== 'object') return null;

  const shape = current?.shape ?? current?._def?.shape;
  return typeof shape === 'function' ? shape() : shape ?? null;
};

const getArrayElement = (schema: any): any | null => {
  const current = unwrap(schema);
  const kind = schemaKind(current);
  if (kind !== 'ZodArray' && kind !== 'array') return null;

  const definitionType = current?._def?.type;
  return current?.element ?? current?._def?.element ?? (typeof definitionType === 'object' ? definitionType : null);
};

const resolveOverride = (override: FormFillOverride, key: string): any => {
  if (typeof override === 'function') return override(key);
  if (Array.isArray(override)) {
    const choice = pick(override);
    if (choice && typeof choice === 'object' && 'value' in choice) return choice.value;
    return choice;
  }
  return override;
};

const resolveOverrides = (overrides: FormFillOverrides) =>
  Object.fromEntries(Object.entries(overrides).map(([key, value]) => [key, resolveOverride(value, key)]));

const detectDomain = (shape: Record<string, any>): FormDomain => {
  const keys = new Set(Object.keys(shape).map((key) => key.toLowerCase()));
  const has = (...values: string[]) => values.every((value) => keys.has(value));

  if (has('studentcode', 'classid', 'sectionid')) return 'student';
  if (has('relationshiptype', 'cin') && (keys.has('dateofbirth') || keys.has('gender'))) return 'parent';
  if (has('licensenumber', 'licenseexpiry', 'yearsofexperience')) return 'driver';
  if (has('brand', 'model', 'licenseplate', 'capacity')) return 'vehicle';
  if (has('starttime', 'endtime', 'totalmarks', 'subjectid')) return 'exam';
  if (has('duration', 'totalmarks', 'passingmarks', 'subjectid')) return 'assessment';
  if (has('specialization', 'hiredate', 'bankaccount')) return 'teacher';
  if (has('emergencycontact', 'emergencyphone', 'cin', 'status')) return 'teacher';
  if (has('expensedate', 'invoicenumber', 'amount')) return 'expense';
  if (has('targetaudience', 'publishdate', 'expirydate')) return 'announcement';
  if (has('startdate', 'enddate', 'visibility')) return 'event';
  if (has('paymenttype', 'category', 'amount', 'name')) return 'feeType';
  if (has('academicyear', 'level', 'name')) return 'class';
  if (has('maxstudents', 'roomnumber', 'classid', 'name')) return 'section';
  if (has('gradelevel', 'code', 'name')) return 'subject';
  return 'generic';
};

const generateDomainValues = (domain: FormDomain, overrides: Record<string, any>): Record<string, any> => {
  switch (domain) {
    case 'student': return generateStudent(overrides);
    case 'parent': return generateParent(overrides);
    case 'teacher': return generateTeacher({ ...overrides, assignments: overrides.assignments ?? [] });
    case 'driver': return generateDriver(overrides);
    case 'vehicle': return generateVehicle(overrides);
    case 'exam': return generateExam(overrides);
    case 'assessment': return generateAssessment(overrides);
    case 'expense': return generateExpense(overrides);
    case 'announcement': return generateAnnouncement(overrides);
    case 'event': return generateEvent(overrides);
    case 'feeType': return generateFeeType();
    case 'class': return generateClass();
    case 'section': return generateSection(overrides.classId);
    case 'subject': return generateSubject();
    default: return {};
  }
};

const includes = (key: string, ...parts: string[]) => parts.some((part) => key.includes(part));

const fallbackValue = (rawKey: string, domain: FormDomain): any => {
  const key = rawKey.toLowerCase();

  if (key === 'id' || key.endsWith('id') || key.endsWith('by')) return '';
  if (includes(key, 'image', 'logo') && !includes(key, 'website')) return undefined;
  if (includes(key, 'email')) {
    const person = fake.fullName(fake.gender());
    return fake.email(person.firstName, person.lastName);
  }
  if (includes(key, 'phone')) return fake.phone();
  if (key === 'cin') return fake.cin();
  if (includes(key, 'website', 'url')) return generic.url();
  if (includes(key, 'academicyear')) return generic.academicYear();
  if (includes(key, 'nationality')) return fake.nationality();
  if (includes(key, 'occupation')) return fake.occupation();
  if (includes(key, 'currency')) return 'MAD';
  if (includes(key, 'timezone')) return 'Africa/Casablanca';
  if (includes(key, 'password')) return 'Password123!';
  if (includes(key, 'sessiontimeout')) return '60';
  if (key === 'startmonth') return 'september';
  if (key === 'endmonth') return 'june';
  if (key === 'dateofbirth') return domain === 'student' ? fake.studentBirthdate() : fake.parentBirthdate();
  if (includes(key, 'time')) return generic.time();
  if (includes(key, 'expiry', 'duedate', 'deadline')) return generic.future();
  if (includes(key, 'date') || key.endsWith('at')) return generic.date();
  if (includes(key, 'totalmarks')) return 100;
  if (includes(key, 'passingmarks', 'minimumpassinggrade')) return 50;
  if (includes(key, 'marks')) return fake.randomInt(0, 100);
  if (includes(key, 'duration')) return 60;
  if (includes(key, 'capacity', 'maxstudents', 'maxclasssize')) return 30;
  if (includes(key, 'year')) return new Date().getFullYear();
  if (includes(key, 'salary')) return fake.randomInt(4000, 15000);
  if (includes(key, 'amount', 'price', 'cost')) return fake.randomInt(100, 5000);
  if (includes(key, 'requirement')) return 75;
  if (includes(key, 'gradingperiods')) return 4;
  if (includes(key, 'gradelevel')) return fake.randomInt(1, 12);
  if (includes(key, 'roomnumber')) return fake.randomInt(1, 50);
  if (includes(key, 'experience', 'workload', 'hours')) return fake.randomInt(0, 20);
  if (includes(key, 'mileage', 'odometer')) return fake.randomInt(0, 100000);
  if (includes(key, 'quantity')) return fake.randomInt(10, 100);
  if (key === 'number') return fake.randomInt(1, 12);
  if (key === 'level') return String(fake.randomInt(1, 12));
  if (includes(key, 'title')) return generic.title();
  if (includes(key, 'medical')) return fake.medicalConditions();
  if (includes(key, 'previousschool')) return fake.previousSchool();
  if (includes(key, 'description', 'notes', 'content', 'message', 'instructions', 'feedback', 'reason', 'degrees')) return generic.paragraph();
  if (key.endsWith('latitude') || key.endsWith('longitude')) return null;
  if (includes(key, 'address')) return fake.address();
  if (key === 'studentcode') return fake.studentCode();
  if (includes(key, 'code')) return generic.code();
  if (includes(key, 'licensenumber')) return fake.driverLicenseNumber();
  if (includes(key, 'licensetype')) return fake.driverLicenseType();
  if (includes(key, 'name')) return fake.fullName(fake.gender()).fullName;
  return generic.title();
};

/**
 * Builds submit-ready form values from a Zod object schema. Known school
 * domains use the same entity generators as demo seeding; overrides supply
 * live relation ids and values that must be pinned by the caller.
 */
export const buildFormFill = (
  schema: any,
  overrides: FormFillOverrides = {},
): Record<string, any> => {
  const shape = getObjectShape(schema) ?? {};
  const domain = detectDomain(shape);
  const resolvedOverrides = resolveOverrides(overrides);
  const generated = generateDomainValues(domain, resolvedOverrides);
  const output: Record<string, any> = {};

  for (const key of Object.keys(shape)) {
    if (key === 'id') {
      output[key] = '';
      continue;
    }
    if (key in resolvedOverrides) {
      output[key] = resolvedOverrides[key];
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(generated, key) && generated[key] !== undefined) {
      output[key] = generated[key];
      continue;
    }

    const enumValues = getEnumValues(shape[key]);
    if (enumValues?.length) {
      output[key] = pick(enumValues);
      continue;
    }
    if (isBoolean(shape[key])) {
      output[key] = true;
      continue;
    }

    const arrayElement = getArrayElement(shape[key]);
    if (arrayElement) {
      output[key] = getObjectShape(arrayElement)
        ? [buildFormFill(arrayElement)]
        : [fallbackValue(key, domain)];
      continue;
    }

    output[key] = getObjectShape(shape[key])
      ? buildFormFill(shape[key])
      : fallbackValue(key, domain);
  }

  return output;
};
