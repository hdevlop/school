import {
  classesData,
  feeTypeData as feeTypesData,
  sectionsData,
  subjectsData,
} from '@sms/contracts/fixtures';
import settingsData from '../school/data/settings.json';
import { getConfiguredSeedAcademicYear } from './academic-year';

export const seedAcademicYear = getConfiguredSeedAcademicYear();
export const seedAcademicId = (id: string) => `${seedAcademicYear}-${id}`;

export const normalizedSettingsData = {
  ...settingsData,
  currentAcademicYear: seedAcademicYear,
  calendarSystem: settingsData.calendarSystem as 'SEMESTER' | 'TRIMESTER' | 'QUARTER',
  language: settingsData.language as 'en' | 'fr' | 'ar' | 'es',
  theme: settingsData.theme as 'light' | 'dark',
  dateFormat: settingsData.dateFormat as 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'DD-MM-YY' | 'DD-MM-YYYY',
  timeFormat: settingsData.timeFormat as '12' | '24',
  attendanceMode: 'daily' as 'daily' | 'per_class',
};

export const normalizedSubjectsData = subjectsData.map((subject) => ({
  ...subject,
  gradeLevel: 1,
}));

export const normalizedSectionsData = sectionsData.map((section) => ({
  ...section,
  id: seedAcademicId(section.id),
  classId: seedAcademicId(section.classId),
  roomNumber: Number(section.roomNumber),
  status: 'active' as const,
}));

export const schoolSeedData = {
  classesData: classesData.map((schoolClass) => ({ ...schoolClass, id: seedAcademicId(schoolClass.id), academicYear: seedAcademicYear })),
  feeTypesData,
  settingsData: normalizedSettingsData,
  sectionsData: normalizedSectionsData,
  subjectsData: normalizedSubjectsData,
};
