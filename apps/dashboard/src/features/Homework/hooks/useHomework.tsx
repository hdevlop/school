'use client'
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';
import { useEntityCRUD } from 'najm-kit/query/crud';
import type { HomeworkRow } from '@sms/contracts';
import { useYearScopedList, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import * as homeworkApi from '@/services/homeworkApi';

/** The list this feature's page opens with. */
export const homeworkListRead = { resource: 'homework', fetch: homeworkApi.getHomeworkApi } satisfies YearScopedRead;

/** What the form hands over: the text, the files to add and the stored ones to drop. */
export type HomeworkSave = homeworkApi.HomeworkPayload & {
  files?: File[];
  removedAttachmentIds?: string[];
};

export const useHomework = (options?: { enabled?: boolean }) => {
  const { enabled = true } = options || {};
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const crud = useEntityCRUD('homework', {
    getAll: homeworkApi.getHomeworkApi,
    getById: homeworkApi.getHomeworkByIdApi,
    create: homeworkApi.createHomeworkApi,
    update: homeworkApi.updateHomeworkApi,
    delete: homeworkApi.deleteHomeworkApi,
  });

  const { data: homework, isLoading: isHomeworkLoading, isError, error, refetch } = useYearScopedList({ ...homeworkListRead, enabled });
  const { mutateAsync: createHomework, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateHomework, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteHomework, isLoading: isDeleting } = crud.useDelete();

  // The text is saved first, then its files. A refused file leaves the text
  // posted, which is what the quota promises, and says so.
  const saveHomework = useCallback(async ({ files = [], removedAttachmentIds = [], ...payload }: HomeworkSave) => {
    const saved = payload.id
      ? await updateHomework({ ...payload, id: payload.id })
      : await createHomework(payload);
    const id = payload.id ?? (saved as { data?: HomeworkRow } | undefined)?.data?.id;
    if (!id || (!files.length && !removedAttachmentIds.length)) return saved;
    try {
      for (const attachmentId of removedAttachmentIds) await homeworkApi.removeHomeworkAttachmentApi(id, attachmentId);
      if (files.length) await homeworkApi.addHomeworkAttachmentsApi(id, files);
    } catch (failure) {
      const reason = failure instanceof Error && failure.message ? failure.message : '';
      toast.error([t('homework.errors.uploadFailed'), reason].filter(Boolean).join(' '));
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['homework'] });
    }
    return saved;
  }, [createHomework, updateHomework, queryClient, t]);

  return {
    homework: homework as HomeworkRow[] | undefined,
    isError,
    error,
    refetch,
    saveHomework,
    deleteHomework,
    isHomeworkLoading,
    isSaving: isCreating || isUpdating,
    isDeleting,
  };
};

/** "Vu par le parent": marks one homework seen for one of the parent's children. */
export const useAcknowledgeHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) => homeworkApi.acknowledgeHomeworkApi(id, studentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['homework'] }),
    onError: (error: Error) => toast.error(error.message),
  });
};
