'use client';

import React from 'react';
import { NButton, NEmptyState } from 'najm-kit';
import { Plus, SearchX, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { FEATURE_ICONS, type FeatureIconKey } from '@/shared/featureIcons';

type Translate = ReturnType<typeof useTranslation>['t'];

type EmptyStateText = { title: string; description?: string };

/**
 * What each list view says when it holds nothing yet.
 *
 * The kit's default is deliberately generic — an `Inbox`, "No data available",
 * "Add your first item to get started." — because the kit does not know what
 * the table lists. This is where the application supplies that: the feature's
 * own mark, taken from the same map the sidebar reads, and words that name the
 * thing the user would be creating.
 *
 * The text is fetched per feature rather than composed from a noun, because
 * "Add your first {{noun}}" has no single correct shape across English,
 * French, Spanish and Arabic — gender, article and verb all move with the word.
 *
 * Each entry is a function so a screen resolves only its own two keys, and so
 * `bun run i18n:check` still sees literal translation keys to verify.
 */
const EMPTY_STATE_TEXT = {
  students: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.students.title'),
    description: t('emptyStates.students.description'),
  }),
  parents: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.parents.title'),
    description: t('emptyStates.parents.description'),
  }),
  teachers: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.teachers.title'),
    description: t('emptyStates.teachers.description'),
  }),
  staff: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.staff.title'),
    description: t('emptyStates.staff.description'),
  }),
  users: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.users.title'),
    description: t('emptyStates.users.description'),
  }),
  roles: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.roles.title'),
    description: t('emptyStates.roles.description'),
  }),
  permissions: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.permissions.title'),
    description: t('emptyStates.permissions.description'),
  }),
  classes: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.classes.title'),
    description: t('emptyStates.classes.description'),
  }),
  sections: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.sections.title'),
    description: t('emptyStates.sections.description'),
  }),
  cycles: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.cycles.title'),
    description: t('emptyStates.cycles.description'),
  }),
  subjects: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.subjects.title'),
    description: t('emptyStates.subjects.description'),
  }),
  assessments: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.assessments.title'),
    description: t('emptyStates.assessments.description'),
  }),
  exams: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.exams.title'),
    description: t('emptyStates.exams.description'),
  }),
  grades: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.grades.title'),
    description: t('emptyStates.grades.description'),
  }),
  announcements: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.announcements.title'),
    description: t('emptyStates.announcements.description'),
  }),
  discipline: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.discipline.title'),
    description: t('emptyStates.discipline.description'),
  }),
  behaviorRewards: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.behaviorRewards.title'),
    description: t('emptyStates.behaviorRewards.description'),
  }),
  studentAttendance: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.studentAttendance.title'),
    description: t('emptyStates.studentAttendance.description'),
  }),
  staffAttendance: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.staffAttendance.title'),
    description: t('emptyStates.staffAttendance.description'),
  }),
  fees: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.fees.title'),
    description: t('emptyStates.fees.description'),
  }),
  feeTypes: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.feeTypes.title'),
    description: t('emptyStates.feeTypes.description'),
  }),
  expenses: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.expenses.title'),
    description: t('emptyStates.expenses.description'),
  }),
  payroll: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.payroll.title'),
    description: t('emptyStates.payroll.description'),
  }),
  payments: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.payments.title'),
    description: t('emptyStates.payments.description'),
  }),
  installments: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.installments.title'),
    description: t('emptyStates.installments.description'),
  }),
  vehicles: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.vehicles.title'),
    description: t('emptyStates.vehicles.description'),
  }),
  drivers: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.drivers.title'),
    description: t('emptyStates.drivers.description'),
  }),
  documents: (t: Translate): EmptyStateText => ({
    title: t('emptyStates.documents.title'),
    description: t('emptyStates.documents.description'),
  }),
} as const satisfies Partial<Record<FeatureIconKey, (t: Translate) => EmptyStateText>>;

export type EmptyStateFeature = keyof typeof EMPTY_STATE_TEXT;

export interface TableEmptyStateProps {
  /** Which list this is. Selects both the icon and the words. */
  feature: EmptyStateFeature;
  /** Overrides the feature's title — for a view that is empty for its own reason. */
  title?: string;
  /** Overrides the feature's description. Pass `null` to show none. */
  description?: string | null;
  /** Overrides the feature's icon. */
  icon?: LucideIcon;
  /** Shown as the call to action. Without both of these there is no button. */
  createLabel?: string;
  onCreate?: () => void;
}

export default function TableEmptyState({
  feature,
  title,
  description,
  icon,
  createLabel,
  onCreate,
}: Readonly<TableEmptyStateProps>) {
  const { t } = useTranslation();
  const text = EMPTY_STATE_TEXT[feature](t);
  const canCreate = Boolean(onCreate && createLabel);

  return (
    <NEmptyState
      icon={icon ?? FEATURE_ICONS[feature]}
      title={title ?? text.title}
      description={description === null ? undefined : (description ?? text.description)}
      action={
        canCreate ? (
          <NButton size="sm" onClick={() => onCreate?.()}>
            <Plus className="h-4 w-4" />
            {createLabel}
          </NButton>
        ) : undefined
      }
    />
  );
}

/**
 * What a table shows when a filter matched nothing.
 *
 * Separate from the empty state on purpose: a list that has records but none
 * matching the current filters is not a list waiting for its first record, and
 * offering "Add your first student" there would be answering a question nobody
 * asked. `NTable` falls back to `renderEmpty` for this case when no
 * `renderFilteredEmpty` is given, which is why the two always travel together.
 */
function TableFilteredEmptyState() {
  const { t } = useTranslation();

  return (
    <NEmptyState
      icon={SearchX}
      title={t('emptyStates.filtered.title')}
      description={t('emptyStates.filtered.description')}
    />
  );
}

const renderFilteredEmpty = () => <TableFilteredEmptyState />;

/**
 * The `NTable` props that give a list its own empty state.
 *
 * Returned together so they cannot drift apart — see
 * `TableFilteredEmptyState`. Mirrors `tableErrorProps` in
 * `shared/TableErrorState.tsx`, which does the same for a failed request.
 */
export function tableEmptyProps(props: TableEmptyStateProps) {
  return {
    renderEmpty: () => <TableEmptyState {...props} />,
    renderFilteredEmpty,
  };
}
