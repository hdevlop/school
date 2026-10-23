'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SaveRoleAccess } from '@sms/contracts/access-control';
import { getRoleAccessApi, saveRoleAccessApi } from '@/services/roleAccessApi';

export function useRoleAccess(roleId: string) {
  const client = useQueryClient();
  const queryKey = ['role-access', roleId];
  const query = useQuery({ queryKey, queryFn: () => getRoleAccessApi(roleId) });
  const mutation = useMutation({
    mutationFn: (body: SaveRoleAccess) => saveRoleAccessApi(roleId, body),
    onSuccess: async (snapshot) => {
      client.setQueryData(queryKey, snapshot);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['permissions'] }),
        client.invalidateQueries({ queryKey: ['role-permissions'] }),
        client.invalidateQueries({ queryKey: ['roles'] }),
      ]);
    },
  });
  return { ...query, save: mutation.mutateAsync, isSaving: mutation.isPending };
}
