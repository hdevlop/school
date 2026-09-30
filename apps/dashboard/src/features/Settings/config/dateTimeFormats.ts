export const SETTINGS_DATE_FORMAT_VALUES = [
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'DD-MM-YY',
  'DD-MM-YYYY',
] as const;

export const SETTINGS_TIME_FORMAT_VALUES = ['12', '24'] as const;

export type SchoolDateFormat = (typeof SETTINGS_DATE_FORMAT_VALUES)[number];
export type SchoolTimeFormat = (typeof SETTINGS_TIME_FORMAT_VALUES)[number];
