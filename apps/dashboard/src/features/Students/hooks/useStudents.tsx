'use client';

import { useEntityCRUD } from 'najm-kit/query/crud';
import { useYearScopedList, useYearScopedDetail } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import {
  useAcademicYearOptions,
  useViewingAcademicYear,
  useViewingYearCalendar,
} from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { datedRosterDay } from '@/features/AcademicYears/utils/viewingYear';
import * as studentApi from '@/services/studentApi';

export const useStudents = (options?) => {
  const { studentId, enabled = true } = options || {};

  const crud = useEntityCRUD(['students', 'parents', 'fees'], {
    getAll: studentApi.getStudentsApi,
    getById: studentApi.getStudentByIdApi,
    create: studentApi.createStudentApi,
    update: studentApi.updateStudentApi,
    delete: studentApi.deleteStudentApi,
    deleteBulk: studentApi.deleteBulkStudentsApi,
    createBulk: studentApi.createBulkStudentsApi,
  });

  const { data: students, isLoading: isStudentsLoading, isError, error, refetch } = useYearScopedList({
    resource: 'students', fetch: studentApi.getStudentsApi, enabled,
  });
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
  // Until the calendar loads, a register's date may not yet sit in the year.
  const isDatedReady = isDated && areYearsFetched;
  const dated = useYearScopedList({
    resource: 'students',
    parts: [{ onDate: rosterDay }],
    fetch: () => studentApi.getStudentsOnDateApi(rosterDay as string),
    enabled: isDatedReady,
  });

  if (!isDated) {
    return { students: list.students, error: list.error, isStudentsLoading: list.isStudentsLoading };
  }
  return {
    students: dated.data,
    error: dated.error,
    isStudentsLoading: !isDatedReady || dated.isLoading,
  };
};
