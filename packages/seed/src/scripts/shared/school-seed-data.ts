import classesData from '../school/data/classes.json';
import feeTypesData from '../school/data/feeTypes.json';
import sectionsData from '../school/data/sections.json';
import settingsData from '../school/data/settings.json';
import subjectsData from '../school/data/subjects.json';

export const normalizedSettingsData = {
  ...settingsData,
  calendarSystem: settingsData.calendarSystem as 'SEMESTER' | 'TRIMESTER' | 'QUARTER',
  language: settingsData.language as 'en' | 'fr' | 'ar' | 'es',
  theme: settingsData.theme as 'light' | 'dark' | 'system',
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
  roomNumber: Number(section.roomNumber),
  status: 'active' as const,
}));

export const schoolSeedData = {
  classesData,
  feeTypesData,
  settingsData: normalizedSettingsData,
  sectionsData: normalizedSectionsData,
  subjectsData: normalizedSubjectsData,
};
