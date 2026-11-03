import { DISCIPLINE_LOCATION_VALUES, type DisciplineLocation } from '@sms/contracts';

type Translate = (key: string, ...args: any[]) => string;

/** The select's "somewhere else" choice: it opens a text box and is never saved. */
export const OTHER_LOCATION = 'other';

export const isListedDisciplineLocation = (location?: string | null): location is DisciplineLocation =>
  DISCIPLINE_LOCATION_VALUES.includes(location as DisciplineLocation);

export const buildDisciplineLocationOptions = (t: Translate) => [
  ...DISCIPLINE_LOCATION_VALUES.map((value) => ({ value, label: t(`discipline.form.locations.${value}`) })),
  { value: OTHER_LOCATION, label: t('discipline.form.locationOther') },
];

/** A listed place reads in the viewer's language; anything typed by hand reads as it was typed. */
export const disciplineLocationLabel = (t: Translate, location?: string | null) =>
  isListedDisciplineLocation(location) ? t(`discipline.form.locations.${location}`) : location;
