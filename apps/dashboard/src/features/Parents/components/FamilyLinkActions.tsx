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
  const options = records.filter(record => !linkedIds.includes(record.id)).map(record => ({
    value: record.id,
    label: `${record.name}${record.studentCode || record.cin || record.phone ? ` (${record.studentCode || record.cin || record.phone})` : ''}`,
  }));
  if (isLoading) return <NLoadingState surface="panel" label={t('common.loading')} />;
  if (isError) return <NErrorState surface="panel" />;
  return (
    <div className="flex flex-col gap-4">
      <ComboboxInput
        value={selectedId}
        onChange={setSelectedId}
        items={options}
        ariaLabel={t(selectingStudent ? 'parents.profile.selectStudent' : 'parents.family.selectParent')}
        placeholder={t(selectingStudent ? 'parents.profile.selectStudent' : 'parents.family.selectParent')}
        disabled={isPending}
        className="w-full"
      />
      <NButton type="button" loading={isPending} disabled={!options.some(option => option.value === selectedId)} onClick={() => mutateAsync()}>
        <Link2 aria-hidden="true" className="size-4" />
        {t(selectingStudent ? 'parents.profile.linkStudent' : 'parents.family.linkParent')}
      </NButton>
    </div>
  );
}

export function FamilyLinkButton({ target, linkedIds = [] }: { target: LinkTarget; linkedIds?: string[] }) {
  const { can } = usePermissions();
  const { t } = useTranslation();
  const { openDialog } = useDialog();
  if (!can('create:parents') || !can(target.parentId ? 'read:students' : 'read:parents')) return null;
  const label = t(target.parentId ? 'parents.profile.linkStudent' : 'parents.family.linkParent');
  return (
    <NButton type="button" variant="outline" size="sm" onClick={() => openDialog({
      title: label,
      children: <FamilyLinkPicker target={target} linkedIds={linkedIds} />,
      width: 'md',
      showButtons: false,
    })}>
      <Link2 aria-hidden="true" className="size-4" />
      {label}
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
    <NButton type="button" variant="ghost" size="icon-sm" aria-label={`${label}: ${name}`} title={label} loading={isPending}
      onClick={() => confirmDelete({
        title: label,
        itemName: name,
        warningText: t('parents.family.unlinkWarning'),
        confirmText: label,
        onConfirm: () => mutateAsync(),
      })}>
      <Unlink aria-hidden="true" className="size-4" />
    </NButton>
  );
}
