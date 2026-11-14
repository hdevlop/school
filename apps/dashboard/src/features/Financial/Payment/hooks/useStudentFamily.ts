'use client'

import { useQuery } from '@tanstack/react-query';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import { getParentChildrenApi } from '@/services/parentApi';
import { getStudentParentsApi } from '@/services/studentApi';
import type { FamilyChild } from '../utils/familyPayment';

const rows = (response: any): any[] => (Array.isArray(response?.data) ? response.data : []);

/**
 * The parent this student's family pays through, when they pay for more than
 * one child in the viewed year: the parent marked financially responsible
 * first. `null` for an only child, or a viewer who cannot record payments.
 */
export function useStudentFamily(studentId?: string) {
  const { can } = useViewerRole();
  const { viewingYear } = useViewingAcademicYear();
  const enabled = Boolean(studentId) && can('create:payments') && can('read:parents');

  const { data } = useQuery({
    queryKey: ['parents', 'student-family', studentId, viewingYear ?? null],
    queryFn: async () => {
      const parents = rows(await getStudentParentsApi(studentId))
        .sort((left, right) => Number(Boolean(right.financialResponsibility)) - Number(Boolean(left.financialResponsibility)));
      for (const parent of parents) {
        const children = rows(await withAcademicYear(viewingYear, () => getParentChildrenApi(parent.id)));
        if (children.length > 1) {
          return { parent: { id: parent.id as string, name: parent.name as string }, children: children as FamilyChild[] };
        }
      }
      return null;
    },
    enabled,
    staleTime: 60_000,
  });

  return enabled ? data ?? null : null;
}
