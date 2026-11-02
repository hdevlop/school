import type { LinkedToFilter } from './accountLinks';

type Translate = (key: string, ...args: any[]) => string;

const LINKED_TO_LABELS: Record<LinkedToFilter, string> = {
  __all__: 'users.filters.linkedToAll',
  student: 'users.filters.linkedToStudent',
  parent: 'users.filters.linkedToParent',
  staff: 'users.filters.linkedToStaff',
  none: 'users.filters.linkedToNone',
};

export const buildLinkedToOptions = (t: Translate): readonly { value: LinkedToFilter; label: string }[] =>
  (Object.keys(LINKED_TO_LABELS) as LinkedToFilter[]).map(value => ({ value, label: t(LINKED_TO_LABELS[value]) }));
