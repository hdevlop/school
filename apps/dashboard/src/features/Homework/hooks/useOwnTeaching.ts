import { useMemo } from 'react';
import { useTeachers } from '@/features/Teachers/hooks/useTeachers';
import { useTeacherOverview } from '@/features/Dashboard/hooks/useTeacherDashboard';
import type { TeachingAssignment } from '../config/homeworkTeaching';

export type OwnTeaching = { assignments: TeachingAssignment[] | null; isLoading: boolean };

// A teacher works only where they teach. Other roles get `null`: every class,
// section and subject.
export function useOwnTeaching(isTeacher: boolean): OwnTeaching {
  const { data: overview, isLoading: isOverviewLoading } = useTeacherOverview(undefined, isTeacher);
  const { teachers, isTeachersLoading } = useTeachers({ enabled: isTeacher });
  return useMemo(() => {
    if (!isTeacher) return { assignments: null, isLoading: false };
    const self = (teachers || []).find((teacher: any) => teacher.id === overview?.teacher?.id);
    return {
      assignments: Array.isArray(self?.assignments) ? self.assignments : [],
      isLoading: isOverviewLoading || isTeachersLoading,
    };
  }, [isTeacher, teachers, overview, isOverviewLoading, isTeachersLoading]);
}
