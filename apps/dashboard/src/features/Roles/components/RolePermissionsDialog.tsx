"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { Badge, Checkbox } from 'najm-kit';
import { Loader2, Search, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { useRolePermissions } from '../hooks/usePermissions';

const RolePermissionsDialog = ({ role }) => {
  const { t } = useTranslation();
  // Fall back to plain English while new i18n keys are not yet compiled
  // into @sms/server/locales (a server rebuild publishes them).
  const tf = useCallback((key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);

  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const { permissions, isPermissionsLoading } = usePermissions();
  const { rolePermissions, isRolePermissionsLoading, assign, remove } = useRolePermissions(role?.id);

  const assignedIds = useMemo(
    () => new Set((rolePermissions || []).map((p) => p.id)),
    [rolePermissions],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return permissions;
    return permissions.filter((p) =>
      [p.name, p.resource, p.action, p.description]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term)),
    );
  }, [permissions, search]);

  // Group permissions by resource for a readable, scannable layout.
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const permission of filtered) {
      const key = permission.resource || tf('permissions.manage.ungrouped', 'General');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(permission);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, tf]);

  const toggle = async (permission, isAssigned: boolean) => {
    setPending((prev) => ({ ...prev, [permission.id]: true }));
    try {
      if (isAssigned) {
        await remove(permission.id);
      } else {
        await assign(permission.id);
      }
    } catch {
      /* useEntityCRUD surfaces the error via toast */
    } finally {
      setPending((prev) => {
        const next = { ...prev };
        delete next[permission.id];
        return next;
      });
    }
  };

  const loading = isPermissionsLoading || isRolePermissionsLoading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {tf('permissions.manage.title', 'Manage Permissions')}
            </span>
            <span className="text-xs text-muted-foreground">{role?.name}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {assignedIds.size} {tf('permissions.manage.assigned', 'assigned')}
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tf('permissions.filters.searchByName', 'Search permissions...')}
          className="w-full rounded-md border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="max-h-[420px] overflow-y-auto rounded-md border divide-y">
        {loading && (
          <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tf('common.loading', 'Loading...')}
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            {tf('permissions.manage.noPermissions', 'No permissions found')}
          </div>
        )}

        {!loading &&
          groups.map(([resource, perms]) => (
            <div key={resource} className="py-1">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {resource}
              </div>
              {perms.map((permission) => {
                const isAssigned = assignedIds.has(permission.id);
                const isPending = !!pending[permission.id];
                return (
                  <label
                    key={permission.id}
                    className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={isAssigned}
                      disabled={isPending}
                      onCheckedChange={() => toggle(permission, isAssigned)}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{permission.name}</span>
                        {permission.action && (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {permission.action}
                          </Badge>
                        )}
                        {isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                      </div>
                      {permission.description && (
                        <span className="text-xs text-muted-foreground">{permission.description}</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
};

export default RolePermissionsDialog;
