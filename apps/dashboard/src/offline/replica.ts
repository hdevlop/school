import { openSyncReplica } from 'najm-database/sync/client';
import { createOfflineAccess, type OfflineAccessRecord, type OfflineAccessToken } from 'najm-auth/client/offline';
import { scopeKey, type SyncContext } from 'najm-database/sync/contracts';
import { OFFLINE_DURATION_MS, OFFLINE_HASH, OFFLINE_SHARED_YEAR, type OfflineGrant } from '@sms/contracts/offline';
import type { ShellBootstrap } from './bootstrap';

export type SchoolAccessRecord = OfflineAccessRecord & { selectionFence?: string | null };
export type CachedPresentation = { grant: OfflineGrant; bootstrap: ShellBootstrap };

/** Runs inside the replica transaction as well as the helper's higher-level checks. No writes are enrolled. */
export function permitsReplica(policy: unknown, context: SyncContext, writing: boolean, now = Date.now()) {
  const row = policy as OfflineAccessRecord | undefined;
  const grant = row?.entitlement;
  if (writing || row?.schemaVersion !== 1 || row.status !== 'available' || !grant
    || context.replicaSchemaVersion !== 1 || grant.accountId !== context.accountId
    || grant.installationId !== context.installationId || grant.installationEpoch !== context.installationEpoch
    || grant.authorizationGeneration !== context.authorizationGeneration || now < row.highestObservedLocal - 1000) return false;
  const serverNow = grant.issuedAt + Math.max(now, row.highestObservedLocal) - row.enrolledAtLocal;
  if (serverNow >= Math.min(grant.validUntil, grant.issuedAt + OFFLINE_DURATION_MS)) return false;
  return grant.scopes.some(scope => scope.id === scopeKey(context.scope)
    && scope.academicYear === (context.scope.kind === 'year' ? context.scope.yearLabel : OFFLINE_SHARED_YEAR));
}

export async function openSchoolReplica(identity: { installationId: string; accountId: string }, factory?: IDBFactory, now = Date.now,
  selectionFence?: () => string | null) {
  return schoolReplicaView(await openReplicaDatabase(identity, factory, now, selectionFence), now, selectionFence);
}

/** One account database. Its reads require the access row's binding to match `selectionFence`. */
export function openReplicaDatabase(identity: { installationId: string; accountId: string }, factory?: IDBFactory, now = Date.now,
  selectionFence?: () => string | null) {
  return openSyncReplica({ name: `school-read-v1:${identity.installationId}:${identity.accountId}`,
    identity, hashFormat: OFFLINE_HASH, factory, now,
    canAccess: (policy, context, writing) => permitsReplica(policy, context, writing, now())
      && (!selectionFence || (!!selectionFence() && (policy as SchoolAccessRecord)?.selectionFence === selectionFence())) });
}
export type ReplicaDatabase = Awaited<ReturnType<typeof openReplicaDatabase>>;

/**
 * One selection of a database, which several views may share. A view's
 * `selectionFence` is the only one fresh enrollment can bind, so a renewal
 * begun under an older selection cannot authorize a newer one.
 */
export function schoolReplicaView(replica: ReplicaDatabase, now = Date.now, selectionFence?: () => string | null) {
  const presentations = new Map<number, CachedPresentation>();
  const store = {
    async read() { return (await replica.database.get('metadata', 'access') as SchoolAccessRecord | undefined) ?? null; },
    async compareAndSwap(expected: number | null, next: OfflineAccessRecord) {
      return replica.database.transaction(['metadata'], async tx => {
        const current = await tx.get('metadata', 'access') as SchoolAccessRecord | undefined;
        if ((current?.revision ?? null) !== expected) return false;
        // Clock updates/locks preserve the binding. Only fresh server enrollment can bind a new selection.
        const fresh = next.status === 'available' && next.entitlement?.issuedAt !== current?.entitlement?.issuedAt;
        if (fresh && selectionFence && !selectionFence()) return false;
        await tx.put('metadata', selectionFence ? { ...next,
          selectionFence: fresh ? selectionFence() : current?.selectionFence } : next, 'access');
        const presentation = fresh && next.entitlement ? presentations.get(next.entitlement.issuedAt) : undefined;
        if (presentation) await tx.put('metadata', presentation, 'presentation');
        return true;
      }, { durability: 'strict', tags: ['school:access'] });
    },
  };
  const access = createOfflineAccess({ store, now, maxOfflineDurationMs: OFFLINE_DURATION_MS });
  return { replica, access, store,
    async enrollPresentation(token: OfflineAccessToken, grant: OfflineGrant, bootstrap: ShellBootstrap) {
      presentations.set(grant.issuedAt, { grant, bootstrap });
      try {
        return await access.enroll(token, { ...grant, mode: 'automatic-read',
          online: { authenticated: true, accountId: grant.accountId, permissions: grant.permissions } });
      } finally { presentations.delete(grant.issuedAt); }
    },
  };
}
export type SchoolReplica = Awaited<ReturnType<typeof openSchoolReplica>>;

/** Old scopes must be retired before fresh enrollment can bind a changed account/mutation fence. */
export async function retireUnboundScopes(storage: SchoolReplica, selectionFence: string) {
  const policy = await storage.store.read();
  if (!policy?.entitlement || policy.selectionFence === selectionFence) return false;
  const grant = policy.entitlement;
  for (const scope of grant.scopes) {
    await storage.replica.lock({ installationId: grant.installationId, installationEpoch: grant.installationEpoch,
      accountId: grant.accountId, authorizationGeneration: grant.authorizationGeneration, replicaSchemaVersion: 1,
      scope: scope.id === 'shared' ? { kind: 'shared' } : { kind: 'year', yearLabel: scope.academicYear } });
  }
  return true;
}
