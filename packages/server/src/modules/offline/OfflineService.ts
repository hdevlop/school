import { canonicalJson, sha256, sameContext, type ReplicaRecord, type SyncContext } from 'najm-database/sync/contracts';
import type { SnapshotManifest } from 'najm-database/sync/client';
import { PermissionGuard } from 'najm-auth';
import { OFFLINE_DURATION_MS, OFFLINE_PROTOCOL, OFFLINE_SCHEMA, OFFLINE_SHARED_YEAR,
  type OfflineGrant, type OfflineInstallation, type ReadProjection } from '@sms/contracts/offline';
import { Err, I18n, Inject, Service, Transaction, t } from '../../najm';
import { ScopeContext, isAdministratorRole } from '../../auth';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { AcademicYearService } from '../academicYears/AcademicYearService';
import { SettingsService } from '../settings/SettingsService';
import { StudentService } from '../students/StudentService';
import { StudentEnrollmentService } from '../studentEnrollments/StudentEnrollmentService';
import { ClassService } from '../classes/ClassService';
import { OfflineRepository } from './OfflineRepository';
import type { SnapshotInput } from './OfflineDto';

const PAGE_RECORDS = 500;
const PAGE_BYTES = 1_048_576;

/** Enforced by both server and browser; an oversized single response is refused. */
export function splitReadPages(records: ReplicaRecord[]): ReplicaRecord[][] {
  const encoder = new TextEncoder();
  const pages: ReplicaRecord[][] = [];
  let page: ReplicaRecord[] = [];
  // canonicalJson(page) is '[' + records joined by ',' + ']': each record is
  // encoded once and the page's size is kept as a running total.
  let bytes = 2;
  for (const record of records) {
    const size = encoder.encode(canonicalJson([record])).length - 2;
    if (size + 2 > PAGE_BYTES) Err(413, t('offlineRead.errors.pageLimit'));
    if (page.length === PAGE_RECORDS || bytes + (page.length ? 1 : 0) + size > PAGE_BYTES) {
      pages.push(page); page = []; bytes = 2;
    }
    bytes += (page.length ? 1 : 0) + size;
    page.push(record);
  }
  if (page.length) pages.push(page);
  return pages;
}

@Service()
export class OfflineService {
  @Inject(ScopeContext) private scope!: ScopeContext;
  @Year() private readonly year!: ResolvedAcademicYear;
  @I18n() private translate!: (key: string) => string;
  @I18n('offlineRead.errors') private refusal!: (key: string) => string;
  constructor(private repository: OfflineRepository, private years: AcademicYearService,
    private settings: SettingsService, private students: StudentService, private enrollments: StudentEnrollmentService,
    private classes: ClassService, private permission: PermissionGuard) {}

  private async actor(id: string) {
    const actor = await this.repository.actor(id);
    if (!actor || actor.status !== 'active') Err(403, this.refusal('notPermitted'));
    const requestActor = this.scope.getUser();
    if (requestActor?.id !== actor.id || requestActor.role !== actor.role) Err(403, this.refusal('accountChanged'));
    for (const permission of ['read:offline', 'read:students']) {
      if (!this.permission.canActivate(permission, actor.permissions)) Err(403, this.refusal('notPermitted'));
    }
    return actor;
  }
  private generation(actor: NonNullable<Awaited<ReturnType<OfflineRepository['actor']>>>) {
    return sha256(canonicalJson({ id: actor.id, role: actor.role, permissions: actor.permissions, ownership: actor.ownership }));
  }

  @Transaction({ isolation: 'repeatable read' })
  async grant(id: string, installation: OfflineInstallation): Promise<OfflineGrant> {
    const actor = await this.actor(id);
    const available = await this.years.list(actor.role);
    const settings = await this.settings.getPublicSettings();
    if (!settings?.currentAcademicYear) Err(409, this.refusal('settingsRequired'));
    const capabilities = ['read:students'];
    if (this.permission.canActivate('read:classes', actor.permissions)) capabilities.push('read:classes');
    const issuedAt = Date.now();
    const readPermissions = (await this.repository.readPermissionNames()).filter(name => this.permission.canActivate(name, actor.permissions));
    return { ...installation, protocol: OFFLINE_PROTOCOL, schema: OFFLINE_SCHEMA, accountId: id,
      authorizationGeneration: await this.generation(actor), issuedAt, validUntil: issuedAt + OFFLINE_DURATION_MS,
      scopes: [{ id: 'shared', academicYear: OFFLINE_SHARED_YEAR, capabilities: ['read:students'] },
        ...available.years.filter((year): year is NonNullable<typeof year> => !!year)
          .map(year => ({ id: 'year:' + year.label, academicYear: year.label, capabilities }))],
      account: { id, name: actor.name, email: actor.email, image: actor.image, role: actor.role },
      // Only enumerated read capabilities are used for cached presentation; never retain admin wildcards.
      permissions: [...new Set(['read:offline', ...readPermissions, ...capabilities])], activeYear: settings.currentAcademicYear };
  }

  async snapshot(id: string, input: SnapshotInput, language: string) {
    // Outside the repeatable-read snapshot: concurrent downloads deleting the
    // same expired rows there would fail with a serialization error.
    await this.repository.cleanup().catch(() => undefined);
    return this.createSnapshot(id, input, language);
  }

  @Transaction({ isolation: 'repeatable read', timeout: 60_000 })
  async createSnapshot(id: string, input: SnapshotInput, language: string) {
    const actor = await this.actor(id);
    const generation = await this.generation(actor);
    if (generation !== input.authorizationGeneration) Err(409, this.refusal('authorizationChanged'));
    const context: SyncContext = { installationId: input.installationId, installationEpoch: input.installationEpoch,
      accountId: id, authorizationGeneration: generation, replicaSchemaVersion: OFFLINE_SCHEMA,
      scope: input.kind === 'shared' ? { kind: 'shared' } : { kind: 'year', yearLabel: this.year.label } };
    const row = await this.repository.create(id, context);
    const revision = row.id.toString();
    const downloadedAt = Date.now();
    const records: ReplicaRecord<ReadProjection>[] = [];
    const add = (path: string, body: unknown) => records.push({ entity: 'projection', id: JSON.stringify([language, path]),
      revision, deleted: false, value: { path, language, downloadedAt, body: JSON.parse(JSON.stringify(body)) } });
    const envelope = (data: unknown, key: string) => ({ status: 'success', message: this.translate(key), data });
    if (input.kind === 'shared') {
      add('/settings/public', envelope(await this.settings.getPublicSettings(), 'settings.success.retrieved'));
      add('/academic-years', await this.years.list(actor.role));
    } else {
      const students = await this.students.getAll();
      if (students.length > 2000) Err(413, this.refusal('studentLimit'));
      add('/students', envelope(students, 'students.success.retrieved'));
      // getById answers a listed student with its row from this same year-scoped,
      // owned query, so the list supplies each detail. Parents and enrollment
      // history are read for every listed student at once, in the shapes their
      // endpoints return; test:offline:transport compares each with the live route.
      const details = new Map<string, (typeof students)[number]>();
      for (const student of students) if (!details.has(student.id)) details.set(student.id, student);
      const parents = await this.repository.parentsByStudents([...details.keys()]);
      const histories = isAdministratorRole(actor.role) ? await this.enrollments.listByStudents([...details.keys()]) : null;
      for (const [studentId, student] of details) {
        add('/students/' + studentId, envelope(student, 'students.success.retrieved'));
        add('/students/' + studentId + '/parents', envelope(parents.get(studentId) ?? [], 'students.success.retrieved'));
        if (histories) add('/students/' + studentId + '/enrollments', envelope(histories.get(studentId) ?? [], 'students.success.retrieved'));
      }
      // Reuse the exact permission guard and owned/year-scoped repository reached by ClassService.
      if (this.permission.canActivate('read:classes', actor.permissions)) {
        add('/classes', envelope(await this.classes.getAll(), 'classes.success.retrieved'));
      }
    }
    const pages = splitReadPages(records);
    await this.repository.save(row.id, pages);
    const manifest: SnapshotManifest = { generation: revision, context, cursor: revision,
      expiresAt: new Date(row.expiresAt).getTime(), recordCount: records.length,
      pageChecksums: await Promise.all(pages.map(page => sha256(canonicalJson(page)))) };
    return manifest;
  }

  async page(id: string, snapshotId: string, page: number, input: OfflineInstallation & { authorizationGeneration: string }) {
    const actor = await this.actor(id);
    if (await this.generation(actor) !== input.authorizationGeneration) Err(403, this.refusal('authorizationChanged'));
    const snapshot = await this.repository.find(snapshotId, id);
    if (!snapshot || new Date(snapshot.expiresAt).getTime() <= Date.now()) Err(404, this.refusal('snapshotExpired'));
    const expected = { ...snapshot.context, ...input, accountId: id,
      scope: snapshot.context.scope.kind === 'shared' ? { kind: 'shared' as const } : { kind: 'year' as const, yearLabel: this.year.label } };
    if (!sameContext(snapshot.context, expected)) Err(403, this.refusal('scopeMismatch'));
    if (!snapshot.pages[page]) Err(404, this.refusal('pageNotFound'));
    return snapshot.pages[page];
  }
}
