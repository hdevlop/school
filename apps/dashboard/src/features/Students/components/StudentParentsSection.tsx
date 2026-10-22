'use client';

import { NErrorState, NLoadingState, NFormSectionHeader } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { UsersRound } from 'lucide-react';
import { useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { getStudentParentsApi } from '@/services/studentApi';
import { FamilyLinkButton, FamilyUnlinkButton } from '@/features/Parents/components/FamilyLinkActions';

export function StudentParentsSection({ studentId }: { studentId: string }) {
  const { t } = useTranslation();
  const { data: parents, isLoading, isError } = useYearScopedList({
    resource: 'students',
    parts: [studentId, 'parents'],
    fetch: () => getStudentParentsApi(studentId),
  });
  return (
    <section className="mt-6 space-y-3">
      <NFormSectionHeader icon={UsersRound} title={t('students.form.parentsInformation')} />
      <p className="text-sm text-muted-foreground">{t('parents.family.immediateChanges')}</p>
      {isLoading ? <NLoadingState surface="panel" label={t('common.loading')} /> : isError ? <NErrorState surface="panel" /> : <>
        <FamilyLinkButton target={{ studentId }} linkedIds={parents.map(parent => parent.id)} />
        {parents.length ? <ul className="divide-y divide-border">
          {parents.map(parent => <li key={parent.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{parent.name}</p>
              <p className="truncate text-sm text-muted-foreground" dir="auto">{[parent.cin, parent.phone].filter(Boolean).join(' · ')}</p>
            </div>
            <FamilyUnlinkButton parentId={parent.id} studentId={studentId} name={parent.name} />
          </li>)}
        </ul> : <p className="text-sm text-muted-foreground">{t('students.profile.noParentsLinked')}</p>}
      </>}
    </section>
  );
}
