import type { ReplicaRecord } from 'najm-database/sync/contracts';
import { PermissionGuard } from 'najm-auth';
import { authorizeActor, buildGrant, createSnapshot, readSnapshotPage, splitReadPages as splitPages,
  type OfflineRefusal, type PageInput } from 'najm-offline/server';
import { OFFLINE_SWITCH, offlineEnabled, type OfflineGrant, type OfflineInstallation } from '@sms/contracts/offline';
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

/** Enforced by both server and browser; an oversized single response is refused. */
export function splitReadPages(records: ReplicaRecord[]): ReplicaRecord[][] {
  return splitPages(records, () => Err(413, t('offlineRead.errors.pageLimit')));
}

@Service()
export class OfflineService {
  @Inject(ScopeContext) private scope!: ScopeContext;
  @Year() private readonly year!: ResolvedAcademicYear;
  @I18n() private translate!: (key: string) => string;
  /** Each najm-offline refusal, and School's own `studentLimit`, is a key here. */
  @I18n('offlineRead.errors') private refusal!: (key: string) => string;
  constructor(private repository: OfflineRepository, private years: AcademicYearService,
    private settings: SettingsService, private students: StudentService, private enrollments: StudentEnrollmentService,
    private classes: ClassService, private permission: PermissionGuard) {}

  private refuse(status: number, reason: OfflineRefusal | 'studentLimit'): never { return Err(status, this.refusal(reason)); }

  private actor(id: string) {
    // Turned off, every grant and download is refused: clients lock what they hold.
    return authorizeActor(id, { enabled: offlineEnabled(process.env[OFFLINE_SWITCH]), lookup: actor => this.repository.actor(actor),
      requestActor: this.scope.getUser(), permissions: ['read:offline', 'read:students'],
      can: (permission, granted) => !!this.permission.canActivate(permission, granted), refuse: (status, reason) => this.refuse(status, reason) });
  }

  @Transaction({ isolation: 'repeatable read' })
  async grant(id: string, installation: OfflineInstallation): Promise<OfflineGrant> {
    const actor = await this.actor(id);
    const available = await this.years.list(actor.role);
    const settings = await this.settings.getPublicSettings();
    if (!settings?.currentAcademicYear) this.refuse(409, 'settingsRequired');
    const capabilities = ['read:students'];
    if (this.permission.canActivate('read:classes', actor.permissions)) capabilities.push('read:classes');
    const readPermissions = (await this.repository.readPermissionNames()).filter(name => this.permission.canActivate(name, actor.permissions));
    return buildGrant({ installation, actor, capabilities, sharedCapabilities: ['read:students'], readPermissions,
      years: available.years.filter((year): year is NonNullable<typeof year> => !!year).map(year => year.label),
      activeYear: settings.currentAcademicYear });
  }

  async snapshot(id: string, input: SnapshotInput, language: string) {
    // Outside the repeatable-read snapshot: concurrent downloads deleting the
    // same expired rows there would fail with a serialization error.
    await this.repository.snapshots.cleanup().catch(() => undefined);
    return this.createSnapshot(id, input, language);
  }

  @Transaction({ isolation: 'repeatable read', timeout: 60_000 })
  async createSnapshot(id: string, input: SnapshotInput, language: string) {
    const actor = await this.actor(id);
    const envelope = (data: unknown, key: string) => ({ status: 'success', message: this.translate(key), data });
    return createSnapshot({ store: this.repository.snapshots, actor, input, yearLabel: () => this.year.label, language, refuse: (status, reason) => this.refuse(status, reason),
      project: async (add, kind) => {
        if (kind === 'shared') {
          add('/settings/public', envelope(await this.settings.getPublicSettings(), 'settings.success.retrieved'));
          add('/academic-years', await this.years.list(actor.role));
          return;
        }
        const students = await this.students.getAll();
        if (students.length > 2000) this.refuse(413, 'studentLimit');
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
      } });
  }

  async page(id: string, snapshotId: string, page: number, input: PageInput) {
    const actor = await this.actor(id);
    return readSnapshotPage({ store: this.repository.snapshots, actor, snapshotId, page, input, yearLabel: () => this.year.label,
      refuse: (status, reason) => this.refuse(status, reason) });
  }
}
