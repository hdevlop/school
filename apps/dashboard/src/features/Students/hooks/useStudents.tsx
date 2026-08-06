'use client';

import { useEntityCRUD } from '@/hooks/useEntityCRUD';
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

  const { data: students, isLoading: isStudentsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: student, isLoading: isStudentLoading } = crud.useGetById(studentId, !!studentId);

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