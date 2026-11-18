'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';
import type { CompetencyAssignment, CompetencyDomain, CompetencyEvaluations, CompetencyLevel, CompetencyYearLevels } from '@sms/contracts';
import { useAcademicYearScope, useYearScopedDetail, useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { withAcademicYear, yearScopedKey } from '@/features/AcademicYears/utils/yearScope';
import * as competencyApi from '@/services/competencyApi';

const RESOURCE = 'competencies';

/** The classes and subjects the page offers: a teacher's own, else those with a list. */
export function useCompetencyAssignments(enabled = true) {
  const list = useYearScopedList({ resource: RESOURCE, parts: ['assignments'], fetch: competencyApi.getCompetencyAssignmentsApi, enabled });
  return { ...list, data: list.data as CompetencyAssignment[] };
}

export function useCompetencyCatalog(teacherAssignmentId: string | undefined) {
  const list = useYearScopedList({
    resource: RESOURCE,
    parts: ['catalog', teacherAssignmentId],
    fetch: () => competencyApi.getCompetencyCatalogApi(teacherAssignmentId!),
    enabled: !!teacherAssignmentId,
  });
  return { ...list, data: list.data as CompetencyDomain[] };
}

const evaluationParts = (teacherAssignmentId: string | undefined, month: string) => ['evaluations', teacherAssignmentId, month] as const;

export function useCompetencyEvaluations(teacherAssignmentId: string | undefined, month: string) {
  const detail = useYearScopedDetail({
    resource: RESOURCE,
    parts: evaluationParts(teacherAssignmentId, month),
    fetch: () => competencyApi.getCompetencyEvaluationsApi(teacherAssignmentId!, month),
    enabled: !!teacherAssignmentId && !!month,
  });
  return { ...detail, data: detail.data as CompetencyEvaluations | null };
}

export function useStudentCompetencySheet(studentId: string | undefined, month: string, subjectId?: string) {
  const detail = useYearScopedDetail({
    resource: RESOURCE,
    parts: ['sheet', studentId, month, subjectId ?? ''],
    fetch: () => competencyApi.getStudentCompetencySheetApi(studentId!, month, subjectId || undefined),
    enabled: !!studentId && !!month,
  });
  return { ...detail, data: detail.data as competencyApi.CompetencySheet | null };
}

/** One class and subject's levels in every month of the year, for the follow-up report. */
export function useCompetencyYearLevels(teacherAssignmentId: string | undefined) {
  const detail = useYearScopedDetail({
    resource: RESOURCE,
    parts: ['year', teacherAssignmentId],
    fetch: () => competencyApi.getCompetencyYearLevelsApi(teacherAssignmentId!),
    enabled: !!teacherAssignmentId,
  });
  return { ...detail, data: detail.data as CompetencyYearLevels | null };
}

type LevelChange = competencyApi.SetCompetencyLevel & { teacherAssignmentId: string };

/**
 * Sets a pupil's level and shows it at once. A refused save puts the cached
 * levels back and keeps the change, so the page can offer Retry.
 */
export function useSetCompetencyLevel() {
  const queryClient = useQueryClient();
  const scope = useAcademicYearScope();
  const [failed, setFailed] = useState<LevelChange | null>(null);

  const mutation = useMutation({
    mutationFn: ({ teacherAssignmentId: _assignment, ...change }: LevelChange) =>
      withAcademicYear(scope.academicYear, () => competencyApi.setCompetencyLevelApi(change)),
    onMutate: async (change) => {
      setFailed(null);
      const key = yearScopedKey(RESOURCE, scope, ...evaluationParts(change.teacherAssignmentId, change.month));
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ data: CompetencyEvaluations }>(key);
      if (previous?.data) {
        const others = previous.data.evaluations.filter((item) =>
          !(item.competencyId === change.competencyId && item.studentId === change.studentId && item.month === change.month));
        const next = change.level ? [...others, { ...change, level: change.level as CompetencyLevel }] : others;
        queryClient.setQueryData(key, { ...previous, data: { ...previous.data, evaluations: next } });
      }
      return { key, previous };
    },
    onError: (_error, change, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
      setFailed(change);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [RESOURCE] }),
  });

  const setLevel = useCallback((change: LevelChange) => mutation.mutate(change), [mutation]);
  const retry = useCallback(() => { if (failed) mutation.mutate(failed); }, [failed, mutation]);
  return { setLevel, retry, failed: !!failed, isSaving: mutation.isPending };
}

/**
 * Saves the remark for a pupil's parents as the teacher types: quietly, since
 * the footer shows it; a refusal says why, and the footer keeps the text.
 */
export function useSaveCompetencyRemark() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const scope = useAcademicYearScope();
  const mutation = useMutation({
    mutationFn: (data: competencyApi.SetCompetencyRemark) =>
      withAcademicYear(scope.academicYear, () => competencyApi.setCompetencyRemarkApi(data)),
    onError: (error) => { toast.error((error as Error)?.message || t('competencies.catalog.failed')); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [RESOURCE] }),
  });
  const save = useCallback((data: competencyApi.SetCompetencyRemark) => mutation.mutateAsync(data), [mutation]);
  return { save, isSaving: mutation.isPending };
}

/** Building the list: each change says so, or why it was refused, and reloads the page's reads. */
export function useCompetencyCatalogActions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const scope = useAcademicYearScope();

  const run = useCallback(async <T,>(send: () => Promise<T>, success: string) => {
    try {
      const result = await withAcademicYear(scope.academicYear, send);
      toast.success(t(success));
      return result;
    } catch (error) {
      toast.error((error as Error)?.message || t('competencies.catalog.failed'));
      throw error;
    } finally {
      await queryClient.invalidateQueries({ queryKey: [RESOURCE] });
    }
  }, [queryClient, scope.academicYear, t]);

  return {
    createDomain: (data: Parameters<typeof competencyApi.createCompetencyDomainApi>[0]) =>
      run(() => competencyApi.createCompetencyDomainApi(data), 'competencies.success.created'),
    updateDomain: (id: string, data: Parameters<typeof competencyApi.updateCompetencyDomainApi>[1]) =>
      run(() => competencyApi.updateCompetencyDomainApi(id, data), 'competencies.success.updated'),
    deleteDomain: (id: string) => run(() => competencyApi.deleteCompetencyDomainApi(id), 'competencies.success.deleted'),
    createCompetency: (data: Parameters<typeof competencyApi.createCompetencyApi>[0]) =>
      run(() => competencyApi.createCompetencyApi(data), 'competencies.success.created'),
    updateCompetency: (id: string, data: Parameters<typeof competencyApi.updateCompetencyApi>[1]) =>
      run(() => competencyApi.updateCompetencyApi(id, data), 'competencies.success.updated'),
    deleteCompetency: (id: string) => run(() => competencyApi.deleteCompetencyApi(id), 'competencies.success.deleted'),
    applyDefault: (teacherAssignmentId: string) =>
      run(() => competencyApi.applyDefaultCompetencyListApi(teacherAssignmentId), 'competencies.success.defaultApplied'),
    copyCatalog: (fromAssignmentId: string, toAssignmentId: string) =>
      run(() => competencyApi.copyCompetencyCatalogApi(fromAssignmentId, toAssignmentId), 'competencies.success.copied'),
  };
}
