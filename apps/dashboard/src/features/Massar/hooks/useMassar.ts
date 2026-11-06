'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, fileRequest, formApi } from '@/services/http';
import { useAcademicYearScope, useYearScopedDetail } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';

export function useMassarRead<T>(path: string, enabled = true) {
  const read = useYearScopedDetail({ resource: 'massar', parts: [path], fetch: async () => (await api.get(`/massar${path}`)).data, enabled });
  return { ...read, data: read.data as T | null };
}
export function useMassarAction() {
  const scope = useAcademicYearScope(), client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => withAcademicYear(scope.academicYear, action),
    onSuccess: () => client.invalidateQueries({ queryKey: ['massar'] }),
    onError: (error: Error) => toast.error(error.message),
  });
  return { run: mutation.mutateAsync, pending: mutation.isPending, ready: scope.ready };
}
export const massarPost = async (path: string, data?: unknown) => (await api.post(`/massar${path}`, data)).data.data;
export const massarPut = async (path: string, data: unknown) => (await api.put(`/massar${path}`, data)).data.data;
export async function previewMassar(files: File[]) {
  const data = Object.fromEntries(files.map((file, index) => [`upload${index}`, file]));
  return (await formApi.post('/massar/imports/preview', data)).data.data;
}
export async function downloadMassar(path: string, data?: unknown, fallback = 'massar.xlsx') {
  const response = await fileRequest(data === undefined ? 'GET' : 'POST', `/massar${path}`, data === undefined ? undefined : new Blob([JSON.stringify(data)], { type: 'application/json' }));
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(response.headers.get('Content-Disposition') ?? '')?.[1];
  const url = URL.createObjectURL(await response.blob()), link = document.createElement('a');
  link.href = url; link.download = encoded ? decodeURIComponent(encoded) : fallback; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
