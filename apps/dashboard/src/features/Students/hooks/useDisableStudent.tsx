"use client";

import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { useDialog } from '@/shared/useDialog';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import { endEnrollmentApi, getStudentEnrollmentsApi } from '@/services/studentEnrollmentApi';
import { EndEnrollmentForm } from '../components/StudentProfile/Enrollment/EnrollmentForms';
import type { EndEnrollmentFormValues } from '../config/enrollmentSchemas';

export function useDisableStudent(year?: string | null) {
  const { t } = useTranslation();
  const { openDialog } = useDialog();
  const queryClient = useQueryClient();

  return async (student: { id: string; name: string }) => {
    if (!year) return;
    try {
      const enrollments = await withAcademicYear(year, () => getStudentEnrollmentsApi(student.id));
      const enrollment = enrollments.find(item => item.academicYear.label === year);
      const placement = enrollment?.placements.find(item => !item.validTo);
      if (!enrollment || enrollment.leftOn || !placement) {
        toast.error(t('students.enrollment.failed'));
        return;
      }
      openDialog({
        title: `${t('students.enrollment.disable')} - ${student.name}`,
        children: <EndEnrollmentForm current={placement} />,
        width: 'xl',
        primaryButton: {
          form: 'student-end-enrollment-form',
          text: t('students.enrollment.disable'),
          onClick: async (values: EndEnrollmentFormValues) => {
            try {
              await withAcademicYear(year, () => endEnrollmentApi(enrollment.id, values));
              await Promise.all(['student-enrollments', 'students', 'classes', 'sections', 'parents', 'fees', 'dashboard'].map(key =>
                queryClient.invalidateQueries({ queryKey: [key] })));
              toast.success(t('students.enrollment.ended'));
            } catch (error: any) {
              toast.error(error?.response?.data?.message || error?.message || t('students.enrollment.failed'));
              throw error;
            }
          },
        },
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || t('students.enrollment.failed'));
    }
  };
}
