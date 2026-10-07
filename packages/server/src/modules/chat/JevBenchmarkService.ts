import { Err, I18n, Service } from '../../najm';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { chatBenchmarkControlsEnabled, chatBenchmarkSnapshot } from './ChatBenchmarkState';
import { effectiveJevMode, isLocalJevFixtureDatabase, setBenchmarkJevMode, type JevMode } from './JevControls';
import { jevSessionGrants } from './JevSessionGrants';
import { JevIntentClassifier } from './JevIntentClassifier';
import { JevBenchmarkRepository } from './JevBenchmarkRepository';
import { CHATBOT_CONFIG, type ChatbotConfig } from 'najm-chatbot';
import { Inject } from '../../najm';
import { PermissionService, RoleService } from 'najm-auth';

const FIXTURE_READ_RESOURCES = ['students', 'teachers', 'classes', 'sections', 'attendance'] as const;

@Service()
export class JevBenchmarkService {
  @I18n('chatBenchmark.errors') private bt!: (key: string) => string;
  @Year() private readonly year!: ResolvedAcademicYear;
  @Inject(CHATBOT_CONFIG) private readonly chatbotConfig!: ChatbotConfig;
  constructor(private classifier: JevIntentClassifier, private fixture: JevBenchmarkRepository,
    private roles: RoleService, private permissions: PermissionService) {}
  private async ensureEnabled() {
    if (!chatBenchmarkControlsEnabled() || !isLocalJevFixtureDatabase() || !await this.fixture.isMarkedFixture())
      Err(404, this.bt('fixtureRequired'));
  }
  async status() {
    await this.ensureEnabled();
    return { ...chatBenchmarkSnapshot(), mode: effectiveJevMode(), budget: this.classifier.ledger.snapshot(),
      syntheticOnly: true, markedLocalFixture: true, guardVersion: 5, intentWordingVersion: 3,
      threshold: this.classifier.controls.threshold, timeoutMs: this.classifier.controls.timeoutMs,
      billingMode: this.classifier.controls.billingMode, billingTimeoutMs: this.classifier.controls.billingTimeoutMs,
      frameworkPreparationEnabled: this.chatbotConfig.reply?.preparation?.enabled === true };
  }
  async setMode(mode: JevMode) {
    await this.ensureEnabled(); setBenchmarkJevMode(mode);
    if (mode === 'off') this.classifier.cancelInFlight();
    return this.status();
  }
  async issueSession(actorId: string, caseId: string) {
    await this.ensureEnabled();
    return { ...jevSessionGrants.issue(actorId, this.year.label, caseId), ...chatBenchmarkSnapshot() };
  }
  async attempts() { await this.ensureEnabled(); return this.classifier.ledger.recent(); }

  /** Fixed local fixture setup only; uses auth's validators and session invalidation. */
  async prepareFixtureReads(actorId: string) {
    await this.ensureEnabled();
    if (actorId !== 'history-admin' || effectiveJevMode() !== 'off') Err(404, this.bt('fixtureRequired'));
    const role = await this.roles.getByName('admin');
    if (role?.id !== 'history-role-admin') Err(404, this.bt('fixtureRequired'));
    const before = await this.permissions.getPermissionsByRole(role.id);
    const added: string[] = [];
    for (const resource of FIXTURE_READ_RESOURCES) {
      const name = `read:${resource}`;
      let permission = await this.permissions.getByName(name);
      if (!permission) permission = await this.permissions.create({ name, resource, action: 'read',
        description: 'Synthetic Jev history-fixture read check' });
      if (permission.resource !== resource || permission.action !== 'read') Err(404, this.bt('fixtureRequired'));
      if (!before.some(item => item.id === permission.id)) {
        await this.permissions.assignPermissionToRole(role.id, permission.id);
        added.push(name);
      }
    }
    return { fixtureOnly: true, roleId: role.id, added,
      requiredPermissions: FIXTURE_READ_RESOURCES.map(resource => `read:${resource}`),
      requiresFreshLogin: added.length > 0, jevMode: effectiveJevMode() };
  }
}
