import type { HomeworkRow } from '@sms/contracts';

/** The list's two date orders; newest first is where it starts on every screen. */
export const NEWEST_FIRST = [{ id: 'date', desc: true }];
export const OLDEST_FIRST = [{ id: 'date', desc: false }];

/** When a homework was given, to the instant it was added: the day first, then the moment it was saved. */
export const homeworkGivenKey = (row: Pick<HomeworkRow, 'date' | 'createdAt'>) => `${row.date ?? ''}|${row.createdAt ?? ''}`;

/** Two homeworks given the same day are ordered by when they were added. */
export const compareHomeworkGiven = (left: Pick<HomeworkRow, 'date' | 'createdAt'>, right: Pick<HomeworkRow, 'date' | 'createdAt'>) =>
  homeworkGivenKey(left).localeCompare(homeworkGivenKey(right));
