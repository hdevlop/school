'use client';

import { useEntityCRUD } from 'najm-kit/query/crud';
import { useYearScopedList, useYearScopedDetail, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import {
  useAcademicYearOptions,
  useViewingAcademicYear,
  useViewingYearCalendar,
} from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { datedRosterDay } from '@/features/AcademicYears/utils/viewingYear';
import * as studentApi from '@/services/studentApi';

/** The viewed year's students, as the students page opens; the page warm-up asks for the same. */
export const studentListRead = { resource: 'students', fetch: studentApi.getStudentsApi } satisfies YearScopedRead;

/** The students placed on `day`, as a register opens on it; the page warm-up asks for the same. */
export const studentsOnDateRead = (day: string) => ({
  resource: 'students', parts: [{ onDate: day }], fetch: () => studentApi.getStudentsOnDateApi(day),
}) satisfies YearScopedRead;

export const useStudents = (options?) => {
  const { studentId, enabled = true } = options || {};

  const crud = useEntityCRUD(['students', 'insurance', 'parents', 'fees', 'classes', 'sections', 'student-enrollments', 'dashboard'], {
    getAll: studentApi.getStudentsApi,
    getById: studentApi.getStudentByIdApi,
    create: studentApi.createStudentApi,
    update: studentApi.updateStudentApi,
    delete: studentApi.deleteStudentApi,
    deleteBulk: studentApi.deleteBulkStudentsApi,
    createBulk: studentApi.createBulkStudentsApi,
  });

  const { data: students, isLoading: isStudentsLoading, isError, error, refetch } = useYearScopedList({ ...studentListRead, enabled });
  const { data: student, isLoading: isStudentLoading } = useYearScopedDetail({
    resource: 'students', parts: [studentId], fetch: () => studentApi.getStudentByIdApi(studentId),
    enabled: enabled && !!studentId,
  });

  const { mutateAsync: createStudent, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateStudent, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteStudent, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteStudents, isLoading: isBulkDeleting } = crud.useBulkDelete();
  const { mutateAsync: createBulkStudents, isLoading: isBulkCreating } = crud.useBulkCreate();

  return {
    // Data
    students,
    student,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllStudents: crud.useGetAll,
    getStudentById: crud.useGetById,

    // Mutations
    createStudent,
    createBulkStudents,
    updateStudent,
    deleteStudent,
    bulkDeleteStudents,

    // Loading States
    isStudentsLoading,
    isStudentLoading,
    isCreating,
    isBulkCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};

/**
 * The students to mark or grade on `date`. With a day inside the viewed year,
 * those enrolled and placed that day, each in that day's class and section,
 * so nobody who had not arrived, had left, or sat elsewhere is offered.
 * Without a day, the same list as `useStudents`.
 */
export const useStudentsOnDate = (date: string | undefined) => {
  const { viewingYear } = useViewingAcademicYear();
  const { isFetched: areYearsFetched } = useAcademicYearOptions();
  const rosterDay = datedRosterDay(date, viewingYear, useViewingYearCalendar());
  const isDated = !!rosterDay;
  const list = useStudents({ enabled: !isDated });
  // Asked at once rather than after the year list: opening a register used to
  // wait for /academic-years before even asking, about a second on a phone.
  // Until the calendar loads the day may still move into the year (a new key,
  // asked again) or out of it (back to the list), so the answer is shown only
  // for a day the calendar has confirmed, and a refusal for an unconfirmed day
  // is never shown.
  const dated = useYearScopedList({ ...studentsOnDateRead(rosterDay as string), enabled: isDated });

  if (!isDated) {
    return { students: list.students, error: list.error, isStudentsLoading: list.isStudentsLoading };
  }
  return {
    students: areYearsFetched ? dated.data : undefined,
    error: areYearsFetched ? dated.error : null,
    isStudentsLoading: !areYearsFetched || dated.isLoading,
  };
};
