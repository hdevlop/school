'use client';

import { UserX } from 'lucide-react';
import { NBadge, NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

/**
 * A grade's status, said only when it tells something. "Pending" is every
 * student's state until a mark is typed, so it shows nothing; whoever may grade
 * gets a quiet button to mark the student absent instead. An absent student's
 * badge, clicked, puts them back to waiting for a mark.
 */
export function GradeStatus({ status, editable, onToggle }: {
  status: string | null | undefined; editable: boolean; onToggle: () => void;
}) {
  const { t } = useTranslation();
  const value = status || 'pending';
  const toggle = (event: { stopPropagation: () => void }) => { event.stopPropagation(); onToggle(); };

  if (value === 'pending') {
    return editable ? (
      <NButton
        type="button" variant="ghost" size="sm"
        className="size-7 p-0 text-muted-foreground/60 hover:text-destructive"
        title={t('grades.status.missed')} aria-label={t('grades.status.missed')}
        onClick={toggle}
      >
        <UserX className="size-4" />
      </NButton>
    ) : null;
  }
  if (value === 'missed' && editable) {
    return (
      <NButton
        type="button" variant="ghost" size="sm"
        className="h-auto rounded-full p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring"
        title={t('grades.status.pending')}
        onClick={toggle}
      >
        <NBadge status={value} />
      </NButton>
    );
  }
  return <NBadge status={value} />;
}
