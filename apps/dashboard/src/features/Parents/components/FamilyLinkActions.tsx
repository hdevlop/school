'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from 'najm-auth/client/react';
import { ComboboxInput, NButton, NErrorState, NLoadingState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { useDialog } from '@/shared/useDialog';
import { useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { getParentsApi, linkStudentApi, unlinkStudentApi } from '@/services/parentApi';
import { getStudentsApi } from '@/services/studentApi';
import { StudentComboboxInput } from '@/features/Students/components/StudentCombobox';

type LinkTarget = { parentId: string; studentId?: never } | { studentId: string; parentId?: never };

function useRefreshFamily() {
  const queryClient = useQueryClient();
  return () => Promise.all(['parents', 'students'].map(resource =>
    queryClient.invalidateQueries({ queryKey: [resource] })));
}

function FamilyLinkPicker({ target, linkedIds }: { target: LinkTarget; linkedIds: string[] }) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const [selectedId, setSelectedId] = useState('');
  const refresh = useRefreshFamily();
  const selectingStudent = Boolean(target.parentId);
  const { data: records, isLoading, isError, academicYear } = useYearScopedList({
    resource: selectingStudent ? 'students' : 'parents',
    fetch: selectingStudent ? getStudentsApi : getParentsApi,
  });
  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => withAcademicYear(academicYear, () => linkStudentApi(
      target.parentId ?? selectedId, target.studentId ?? selectedId)),
    onSuccess: async () => {
      await refresh();
      toast.success(t('parents.success.studentLinked'));
      await pop();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const available = records.filter(record => !linkedIds.includes(record.id));
  const pickerLabel = t(selectingStudent ? 'parents.profile.selectStudent' : 'parents.family.selectParent');
  if (isLoading) return <NLoadingState surface="panel" label={t('common.loading')} />;
  if (isError) return <NErrorState surface="panel" />;
  return (
    <div className="flex flex-col gap-4">
      {selectingStudent ? (
        <StudentComboboxInput
          value={selectedId}
          onChange={setSelectedId}
          students={available}
          ariaLabel={pickerLabel}
          placeholder={pickerLabel}
          disabled={isPending}
          className="w-full"
        />
      ) : (
        <ComboboxInput
          value={selectedId}
          onChange={setSelectedId}
          items={available.map(record => ({
            value: record.id,
            label: `${record.name}${record.cin || record.phone ? ` (${record.cin || record.phone})` : ''}`,
          }))}
          ariaLabel={pickerLabel}
          placeholder={pickerLabel}
          disabled={isPending}
          className="w-full"
        />
      )}
      <NButton type="button" loading={isPending} disabled={!available.some(record => record.id === selectedId)} onClick={() => mutateAsync()} leftIcon={<Link2 className="size-4" />}>
        {t(selectingStudent ? 'parents.profile.linkStudent' : 'parents.family.linkParent')}
      </NButton>
    </div>
  );
}

export function FamilyLinkButton({ target, linkedIds = [], compact = false }: { target: LinkTarget; linkedIds?: string[]; compact?: boolean }) {
  const { can } = usePermissions();
  const { t } = useTranslation();
  const { openDialog } = useDialog();
  if (!can('create:parents') || !can(target.parentId ? 'read:students' : 'read:parents')) return null;
  const label = t(target.parentId ? 'parents.profile.linkStudent' : 'parents.family.linkParent');
  return (
    <NButton type="button" variant="outline" size="sm"
      className={compact ? 'max-sm:w-8 max-sm:gap-0 max-sm:px-0!' : undefined}
      aria-label={label} title={label} onClick={() => openDialog({
      title: label,
      children: <FamilyLinkPicker target={target} linkedIds={linkedIds} />,
      width: 'md',
      showButtons: false,
    })}>
      <Link2 aria-hidden="true" className="size-4" />
      <span className={compact ? 'max-sm:hidden' : undefined}>{label}</span>
    </NButton>
  );
}

export function FamilyUnlinkButton({ parentId, studentId, name }: { parentId: string; studentId: string; name: string }) {
  const { can } = usePermissions();
  const { t } = useTranslation();
  const { confirmDelete } = useDialog();
  const { viewingYear } = useViewingAcademicYear();
  const refresh = useRefreshFamily();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => withAcademicYear(viewingYear, () => unlinkStudentApi(parentId, studentId)),
    onSuccess: async () => {
      await refresh();
      toast.success(t('parents.success.studentUnlinked'));
    },
  });
  if (!can('delete:parents')) return null;
  const label = t('parents.family.unlink');
  return (
    <NButton type="button" variant="ghost" size="icon-sm" aria-label={`${label}: ${name}`} title={label} loading={isPending} leftIcon={<Unlink className="size-4" />}
      onClick={() => confirmDelete({
        title: label,
        itemName: name,
        warningText: t('parents.family.unlinkWarning'),
        confirmText: label,
        onConfirm: () => mutateAsync(),
      })} />
  );
}
