'use client';
import { useEntityCRUD } from 'najm-kit/query/crud';
import { getVisitRequestsApi, updateVisitRequestApi } from '@/services/visitRequestApi';
export function useVisitRequests() {
  const crud = useEntityCRUD('visit-requests', { getAll: getVisitRequestsApi, update: updateVisitRequestApi });
  const query = crud.useGetAll();
  return { ...query, updateRequest: crud.useUpdate().mutateAsync };
}
