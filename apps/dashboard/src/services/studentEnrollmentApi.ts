import type { StudentYearEnrollmentEndStatus, StudentYearEnrollmentStatus } from '@sms/contracts';
import type { AcademicYearStatus } from '@sms/contracts/academic-years';
import { api } from './http';

export type EnrollmentPlacement = {
  id: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  validFrom: string;
  validTo: string | null;
  reason: string | null;
  actorId?: string | null;
  actorName?: string | null;
  updatedAt?: string | null;
};

export type StudentYearEnrollment = {
  id: string;
  studentId: string;
  status: StudentYearEnrollmentStatus;
  enrolledOn: string;
  leftOn: string | null;
  academicYear: {
    id: string;
    label: string;
    status: AcademicYearStatus;
    reportingStartsOn: string;
    reportingEndsOn: string;
  };
  placements: EnrollmentPlacement[];
};

// A student's yearly enrollments with their dated placements, newest year
// first. Administrators and principals only.
export const getStudentEnrollmentsApi = async (studentId: string): Promise<StudentYearEnrollment[]> => {
  const res = await api.get(`/students/${studentId}/enrollments`);
  return res.data?.data ?? [];
};

export const createEnrollmentApi = async (data: {
  studentId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  enrolledOn: string;
}) => {
  const res = await api.post('/student-enrollments', data);
  return res.data;
};

export const transferEnrollmentApi = async (enrollmentId: string, data: {
  classId: string;
  sectionId: string;
  validFrom: string;
  reason: string;
}) => {
  const res = await api.post(`/student-enrollments/${enrollmentId}/transfer`, data);
  return res.data;
};

export const endEnrollmentApi = async (enrollmentId: string, data: {
  leftOn: string;
  status: StudentYearEnrollmentEndStatus;
}) => {
  const res = await api.post(`/student-enrollments/${enrollmentId}/end`, data);
  return res.data;
};
