'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as routineApi from '@/services/classRoutineApi';
import { useTranslation } from 'najm-i18n/react';

const payload = (response: any, fallback: any) => response?.data ?? fallback;
const errorMessage = (error: any, fallback: string) => error?.response?.data?.message || error?.message || fallback;

export const useRoutinePeriods = () => useQuery({
  queryKey: ['class-routines', 'periods'],
  queryFn: routineApi.getRoutinePeriodsApi,
  select: (response) => payload(response, []),
});

export const useRoutineAssignments = (sectionId?: string) => useQuery({
  queryKey: ['class-routines', 'assignments', sectionId],
  queryFn: () => routineApi.getRoutineAssignmentsApi(sectionId),
  select: (response) => payload(response, []),
  enabled: Boolean(sectionId),
});

export const useRoutineDutyCandidates = (enabled = true) => useQuery({
  queryKey: ['class-routines', 'duty-candidates'],
  queryFn: routineApi.getRoutineDutyCandidatesApi,
  select: (response) => payload(response, []),
  enabled,
});

export const useRoutineList = (filters: Record<string, any>, enabled = true) => useQuery({
  queryKey: ['class-routines', 'list', filters],
  queryFn: () => routineApi.getClassRoutinesApi(filters),
  select: (response) => payload(response, []),
  enabled,
});

export const useRoutine = (id?: string) => useQuery({
  queryKey: ['class-routines', id],
  queryFn: () => routineApi.getClassRoutineApi(id),
  select: (response) => payload(response, null),
  enabled: Boolean(id),
});

export const useTeacherRoutine = (teacherId?: string, academicYear?: string) => useQuery({
  queryKey: ['class-routines', 'teacher', teacherId, academicYear],
  queryFn: () => routineApi.getTeacherRoutineApi(teacherId, academicYear),
  select: (response) => payload(response, []),
  enabled: Boolean(teacherId),
});

export function useRoutineMutations() {
  const client = useQueryClient();
  const { t } = useTranslation();
  const invalidate = async () => client.invalidateQueries({ queryKey: ['class-routines'] });
  const useNamedMutation = (fn: (variables: any) => Promise<any>, success: string) => useMutation<any, any, any>({
    mutationFn: fn,
    onSuccess: async () => {
      await invalidate();
      toast.success(success);
    },
    onError: (error) => toast.error(errorMessage(error, t('classRoutines.ui.messages.saveError'))),
  });

  return {
    createSchedule: useNamedMutation(routineApi.createClassRoutineApi, t('classRoutines.ui.messages.routineCreated')),
    updateSchedule: useNamedMutation(routineApi.updateClassRoutineApi, t('classRoutines.ui.messages.routineUpdated')),
    updateLayout: useNamedMutation(routineApi.updateRoutineLayoutApi, t('classRoutines.ui.messages.timesUpdated')),
    deleteSchedule: useNamedMutation(routineApi.deleteClassRoutineApi, t('classRoutines.ui.messages.routineDeleted')),
    publishSchedule: useNamedMutation(routineApi.publishClassRoutineApi, t('classRoutines.ui.messages.routinePublished')),
    archiveSchedule: useNamedMutation(routineApi.archiveClassRoutineApi, t('classRoutines.ui.messages.routineArchived')),
    createEntry: useNamedMutation(routineApi.createRoutineEntryApi, t('classRoutines.ui.messages.lessonAdded')),
    updateEntry: useNamedMutation(routineApi.updateRoutineEntryApi, t('classRoutines.ui.messages.lessonUpdated')),
    deleteEntry: useNamedMutation(routineApi.deleteRoutineEntryApi, t('classRoutines.ui.messages.lessonRemoved')),
    createDuty: useNamedMutation(routineApi.createRoutineDutyApi, t('classRoutines.ui.messages.supervisionAssigned')),
    updateDuty: useNamedMutation(routineApi.updateRoutineDutyApi, t('classRoutines.ui.messages.supervisionUpdated')),
    deleteDuty: useNamedMutation(routineApi.deleteRoutineDutyApi, t('classRoutines.ui.messages.supervisionRemoved')),
    createPeriod: useNamedMutation(routineApi.createRoutinePeriodApi, t('classRoutines.ui.messages.periodCreated')),
    updatePeriod: useNamedMutation(routineApi.updateRoutinePeriodApi, t('classRoutines.ui.messages.periodUpdated')),
  };
}
