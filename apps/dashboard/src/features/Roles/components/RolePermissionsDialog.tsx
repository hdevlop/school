'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Badge, Button, Checkbox, Input, NAlert, NErrorState, NForbiddenState, Popover, PopoverContent, PopoverTrigger, cn, surfaceBorderClasses } from 'najm-kit';
import { Eye, Info, Loader2, LockKeyhole, RotateCcw, Save, Search } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { matchPermission } from 'najm-auth/client';
import { toast } from 'sonner';
import {
  SIDEBAR_ENTRIES, isSidebarPermission, sidebarPermission, type AccessPermission, type AccessRole,
  type RoleAccessSnapshot, type SidebarKey,
} from '@sms/contracts/access-control';
import { createNavigationItems } from '@/shared/schoolNavigation';
import { PAGE_ACCESS, isSchoolWideRole } from '@/shared/pageAccess';
import { isAuthorizationError } from '@/services/apiError';
import { useRoleAccess } from '../hooks/useRoleAccess';
import {
  STANDARD_ACTIONS, PERMISSION_CATEGORIES, buildPermissionRows, changedValues,
  permissionCategory, sidebarKeysFromPermissions, type PermissionRow,
} from '../config/permissionMatrix';

type Props = { role: AccessRole; onDirtyChange?: (dirty: boolean) => void; actions?: ReactNode };

export default function RolePermissionsDialog({ role, onDirtyChange, actions }: Props) {
  const access = useRoleAccess(role.id);
  const { t } = useTranslation();
  if (access.isPending) return (
    <div className="flex items-center justify-center gap-2 p-12">
      <Loader2 className="size-5 animate-spin" />{t('common.loading')}
    </div>
  );
  if (!access.data) return isAuthorizationError(access.error)
    ? <NForbiddenState surface="panel" />
    : <NErrorState surface="panel" onRetry={() => access.refetch()} />;
  return (
    <PermissionEditor
      role={role} actions={actions} initialSnapshot={access.data} latestSnapshot={access.data}
      save={access.save} isSaving={access.isSaving} onDirtyChange={onDirtyChange}
      reload={async () => (await access.refetch()).data}
    />
  );
}

type EditorProps = Props & {
  initialSnapshot: RoleAccessSnapshot;
  latestSnapshot: RoleAccessSnapshot;
  save: ReturnType<typeof useRoleAccess>['save'];
  isSaving: boolean;
  reload: () => Promise<RoleAccessSnapshot | undefined>;
};

function PermissionEditor({ role, actions, initialSnapshot, latestSnapshot, save, isSaving, onDirtyChange, reload }: EditorProps) {
  const { t } = useTranslation();
  // Retain the original snapshot during background refetches. A stale save is
  // refused by the server instead of silently overwriting another admin's work.
  const [baseline, setBaseline] = useState(initialSnapshot);
  const [draft, setDraft] = useState(() => new Set(initialSnapshot.permissions.filter((p) => !isSidebarPermission(p.name)).map((p) => p.id)));
  const [sidebarKeys, setSidebarKeys] = useState(() => new Set(sidebarKeysFromPermissions(initialSnapshot.permissions)));
  const [search, setSearch] = useState('');
  const [review, setReview] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const reviewRef = useRef<HTMLElement>(null);
  const locked = role.name.toLowerCase() === 'admin';
  const rows = useMemo(() => buildPermissionRows(baseline.catalog), [baseline.catalog]);
  const selectedNames = baseline.catalog.filter((p) => draft.has(p.id)).map((p) => p.name);
  const viewer = { role: role.name, can: (name: string) => matchPermission(selectedNames, name) };
  const sidebarEligibility = new Map<string, boolean>();
  const visit = (items: ReturnType<typeof createNavigationItems>) => {
    for (const item of items) {
      sidebarEligibility.set(item.id, !item.access || PAGE_ACCESS[item.access](viewer));
      if (item.children) visit(item.children);
    }
  };
  visit(createNavigationItems(t, viewer));
  // The footer opens personal preferences even without school-settings access.
  sidebarEligibility.set('settings:preferences', true);
  const permissionsChanged = changedValues(baseline.permissions.filter((p) => !isSidebarPermission(p.name)).map((p) => p.id), draft);
  const navigationChanged = changedValues(sidebarKeysFromPermissions(baseline.permissions), sidebarKeys);
  const changeCount = permissionsChanged.added.length + permissionsChanged.removed.length + navigationChanged.added.length + navigationChanged.removed.length;
  const dirty = changeCount > 0;
  const wildcard = selectedNames.some((name) => name.includes('*'));

  useEffect(() => { onDirtyChange?.(dirty || isSaving); }, [dirty, isSaving, onDirtyChange]);
  useEffect(() => { if (review) reviewRef.current?.scrollIntoView({ block: 'nearest' }); }, [review]);
  useEffect(() => {
    if (!dirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [dirty]);

  const label = (row: PermissionRow) => {
    const key = `roleAccess.resources.${row.resource}`;
    const translated = t(key);
    if (translated !== key) return translated;
    if (row.sidebar) return t(row.sidebar[2]);
    return row.resource.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('-', ' ');
  };
  const permissionLabel = (permission: AccessPermission) => {
    const row = rows.find((row) => row.resource === permission.resource);
    const key = `roleAccess.actions.${permission.action}`;
    const action = t(key);
    return `${row ? label(row) : permission.resource}: ${action === key ? permission.name : action}`;
  };
  const toggle = (permissions: AccessPermission[], checked: boolean) => {
    setDraft((previous) => {
      const next = new Set(previous);
      for (const permission of permissions) {
        if (checked) next.add(permission.id);
        else next.delete(permission.id);
      }
      return next;
    });
    setReview(false);
    setFailure(null);
  };
  const replace = (snapshot: RoleAccessSnapshot) => {
    setBaseline(snapshot);
    setDraft(new Set(snapshot.permissions.filter((p) => !isSidebarPermission(p.name)).map((p) => p.id)));
    setSidebarKeys(new Set(sidebarKeysFromPermissions(snapshot.permissions)));
    setReview(false);
    setFailure(null);
  };
  const apply = async () => {
    setFailure(null);
    try {
      const snapshot = await save({ permissionIds: [...draft], expectedPermissionIds: baseline.permissions.map((p) => p.id), sidebarKeys: [...sidebarKeys] });
      replace(snapshot);
      toast.success(t('roleAccess.saved'));
    } catch (error) {
      setFailure(error instanceof Error ? error.message : t('roleAccess.failed'));
    }
  };
  const renderPermission = (permission: AccessPermission | undefined, module: string, dependency = false) => {
    if (!permission) return <span className="text-muted-foreground" aria-label={t('roleAccess.unavailable')}>—</span>;
    const explicit = draft.has(permission.id);
    const inherited = !explicit && viewer.can(permission.name);
    return (
      <Checkbox checked={explicit || inherited} disabled={locked || isSaving || inherited || dependency}
        title={dependency ? permissionLabel(permission) : undefined}
        aria-label={`${module}: ${t(`roleAccess.actions.${dependency ? 'read' : permission.action}`)}`}
        onCheckedChange={(checked) => toggle([permission], checked === true)} />
    );
  };
  const actionLabel = (action: string) => {
    const key = `roleAccess.actions.${action}`;
    const translated = t(key);
    return translated === key ? action : translated;
  };
  const renderSidebar = (row: PermissionRow) => {
    if (!row.sidebar) return <span className="text-muted-foreground" aria-label={t('roleAccess.noSidebar')}>—</span>;
    const key: SidebarKey = row.sidebar[0];
    const eligible = sidebarEligibility.get(row.sidebar[1]) === true;
    const inherited = viewer.can(sidebarPermission(key));
    return (
      <label className="flex min-h-10 items-center justify-center gap-2">
        <Checkbox checked={(inherited || sidebarKeys.has(key)) && eligible} disabled={locked || isSaving || !eligible || inherited}
          aria-label={`${label(row)}: ${t('roleAccess.sidebar')}`}
          onCheckedChange={(checked) => {
            setSidebarKeys((previous) => {
              const next = new Set(previous);
              if (checked === true) next.add(key);
              else next.delete(key);
              return next;
            });
            setReview(false);
          }} />
        <span className="text-xs text-muted-foreground md:hidden">{t('roleAccess.sidebar')}</span>
      </label>
    );
  };
  const term = search.trim().toLowerCase();
  const filtered = rows.filter((row) => !term || [label(row), row.resource, ...row.permissions.map((p) => p.name)].some((text) => text.toLowerCase().includes(term)));
  const reviewLine = (id: string) => {
    const permission = baseline.catalog.find((p) => p.id === id);
    return permission ? permissionLabel(permission) : id;
  };
  const scope = isSchoolWideRole(role.name) ? 'schoolWide' : ['teacher', 'parent', 'student'].includes(role.name) ? role.name : 'unconfigured';

  return (
    <div className="flex min-w-0 flex-col gap-3" aria-busy={isSaving}>
      <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="break-words text-xl font-semibold capitalize">{role.name}</h2>
            <Badge variant="outline">{draft.size} {t('roleAccess.assigned')}</Badge>
            {locked && <Badge variant="outline" title={t('roleAccess.adminLocked')}><LockKeyhole className="size-3 shrink-0" />{t('roleAccess.locked')}</Badge>}
          </div>
      <div className="flex w-full min-w-0 items-center gap-2 sm:ms-auto sm:w-auto">
        <div className="relative min-w-0 flex-1 sm:w-44 sm:flex-none">
          <Search aria-hidden className="pointer-events-none absolute start-3 top-3 size-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('roleAccess.search')} aria-label={t('roleAccess.search')} className="ps-9" />
        </div>
        <p className="sr-only" aria-live="polite">{dirty ? t('roleAccess.unsaved', { count: changeCount }) : t('roleAccess.noChanges')}</p>
        {dirty && <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">{t('roleAccess.unsaved', { count: changeCount })}</Badge>}
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <Button size="icon" variant="outline" className="size-10" aria-label={t('roleAccess.discard')} title={t('roleAccess.discard')} disabled={!dirty || isSaving} onClick={() => replace(latestSnapshot)}><RotateCcw className="size-4" /></Button>
          <Button size="icon" className="size-10" aria-label={t('roleAccess.save')} title={t('roleAccess.save')} disabled={!dirty || locked || isSaving} onClick={() => setReview(true)}><Save className="size-4" /></Button>
          <Popover>
            <PopoverTrigger asChild><Button size="icon" variant="outline" className="size-10" aria-label={t('roleAccess.sidebarHelp')} title={t('roleAccess.sidebarHelp')}><Info className="size-4" /></Button></PopoverTrigger>
            <PopoverContent className="max-w-[calc(100vw-2rem)] space-y-2 text-sm">
              <p>{t('roleAccess.scopeTitle')}: {t(`roleAccess.scope.${scope}`)}</p>
              {locked && <p>{t('roleAccess.adminLocked')}</p>}
              <p>{t('roleAccess.sidebarHelp')}</p>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      </header>
      {scope === 'unconfigured' && <NAlert tone="warning" icon={Eye} title={t('roleAccess.scopeTitle')} description={t(`roleAccess.scope.${scope}`)} />}
      {!locked && wildcard && <NAlert tone="warning" description={t('roleAccess.wildcardHint')} />}
      {filtered.length === 0 && <p className="py-6 text-center text-muted-foreground">{t('roleAccess.noPermissions')}</p>}
      {PERMISSION_CATEGORIES.map((category) => {
        const categoryRows = filtered.filter((row) => permissionCategory(row.resource) === category);
        if (!categoryRows.length) return null;
        const extraActions = [...new Set(categoryRows.flatMap((row) => row.special.map((permission) => permission.action)))];
        return (
          <section key={category} aria-label={t(`roleAccess.categories.${category}`)} className={cn('overflow-hidden rounded-lg', surfaceBorderClasses())}>
            <h3 className={cn('bg-muted/50 px-4 py-2 text-sm font-semibold', surfaceBorderClasses(true, 'bottom'))}>{t(`roleAccess.categories.${category}`)}</h3>
            <div className="hidden md:block">
              <table className="w-full table-fixed text-sm">
                <thead><tr className={cn('text-xs text-muted-foreground', surfaceBorderClasses(true, 'bottom'))}>
                  <th scope="col" className="w-[28%] px-3 py-3 text-start font-medium">{t('roleAccess.module')}</th>
                  {STANDARD_ACTIONS.map((action) => <th scope="col" key={action} className="px-1 py-3 text-center font-medium">{t(`roleAccess.actions.${action}`)}</th>)}
                  {extraActions.map((action) => <th scope="col" key={`extra-${action}`} className="break-words px-1 py-3 text-center font-medium">{actionLabel(action)}</th>)}
                  <th scope="col" className="w-[18%] px-1 py-3 text-center font-medium">{t('roleAccess.sidebar')}</th>
                </tr></thead>
                <tbody>{categoryRows.map((row, rowIndex) => {
                  const standard = Object.values(row.standard).filter((p): p is AccessPermission => !!p);
                  const count = standard.filter((p) => viewer.can(p.name)).length;
                  return <tr key={row.resource} className={surfaceBorderClasses(rowIndex < categoryRows.length - 1, 'bottom')}>
                    <th scope="row" className="px-3 py-2 text-start font-medium">
                      <label className="flex min-h-10 items-center gap-3">
                        {standard.length > 0 && <Checkbox aria-label={`${label(row)}: ${t('roleAccess.selectModule')}`}
                          checked={count === standard.length ? true : count ? 'indeterminate' : false}
                          disabled={locked || isSaving || wildcard} onCheckedChange={(checked) => toggle(standard, checked === true)} />}
                        <span className="break-words">{label(row)}</span>
                      </label>
                    </th>
                    {STANDARD_ACTIONS.map((action) => <td key={action} className="px-1 py-2 text-center">{renderPermission(row.standard[action] ?? (action === 'read' ? row.readDependency : undefined), label(row), action === 'read' && !row.standard.read && !!row.readDependency)}</td>)}
                    {extraActions.map((action) => {
                      const permissions = row.special.filter((permission) => permission.action === action);
                      return <td key={`extra-${action}`} className="px-1 py-2 text-center">
                        {permissions.length ? <div className="flex flex-wrap items-center justify-center gap-2">{permissions.map((permission) => (
                          <span key={permission.id} title={permissionLabel(permission)}>{renderPermission(permission, label(row))}</span>
                        ))}</div> : <span className="text-muted-foreground" aria-label={t('roleAccess.unavailable')}>—</span>}
                      </td>;
                    })}
                    <td className="px-1 py-2">{renderSidebar(row)}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div className="md:hidden">{categoryRows.map((row, rowIndex) => (
              <div key={row.resource} className={cn('space-y-3 p-4', surfaceBorderClasses(rowIndex < categoryRows.length - 1, 'bottom'))}>
                <div className="flex items-center justify-between gap-3"><span className="font-medium">{label(row)}</span>{renderSidebar(row)}</div>
                <div className="grid grid-cols-2 gap-2">{STANDARD_ACTIONS.filter((action) => row.standard[action] || (action === 'read' && row.readDependency)).map((action) => (
                  <label key={action} className="flex min-h-10 items-center gap-2 text-sm">{renderPermission(row.standard[action] ?? row.readDependency, label(row), action === 'read' && !row.standard.read && !!row.readDependency)}{t(`roleAccess.actions.${action}`)}</label>
                ))}
                  {row.special.map((permission) => (
                    <label key={permission.id} className="flex min-h-10 items-center gap-2 text-sm">
                      {renderPermission(permission, label(row))}{actionLabel(permission.action)}
                    </label>
                  ))}
                </div>
              </div>
            ))}</div>
          </section>
        );
      })}
      {failure && <div role="alert" className="space-y-2">
        <NAlert tone="error" description={failure} />
        <Button variant="outline" disabled={isSaving} onClick={async () => { const snapshot = await reload(); if (snapshot) replace(snapshot); }}>{t('roleAccess.reload')}</Button>
      </div>}
      {review && <section ref={reviewRef} className={cn('space-y-3 rounded-lg p-4', surfaceBorderClasses())} aria-label={t('roleAccess.review')}>
        <h3 className="font-medium">{t('roleAccess.review')}</h3>
        <ul className="space-y-1 text-sm">
          {permissionsChanged.added.map((id) => <li key={`add-${id}`}>+ {t('roleAccess.allow')}: {reviewLine(id)}</li>)}
          {permissionsChanged.removed.map((id) => <li key={`remove-${id}`}>− {t('roleAccess.remove')}: {reviewLine(id)}</li>)}
          {navigationChanged.added.map((key) => <li key={`show-${key}`}>+ {t('roleAccess.show')}: {t(SIDEBAR_ENTRIES.find((entry) => entry[0] === key)![2])}</li>)}
          {navigationChanged.removed.map((key) => <li key={`hide-${key}`}>− {t('roleAccess.hide')}: {t(SIDEBAR_ENTRIES.find((entry) => entry[0] === key)![2])}</li>)}
        </ul>
        <p className="text-xs text-muted-foreground">{t('roleAccess.sessionsHint')}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setReview(false)} disabled={isSaving}>{t('common.cancel')}</Button>
          <Button onClick={apply} disabled={isSaving} loading={isSaving}>{t('roleAccess.apply')}</Button>
        </div>
      </section>}
    </div>
  );
}
