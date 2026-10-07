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

@Service()
export class JevBenchmarkService {
  @I18n('chatBenchmark.errors') private bt!: (key: string) => string;
  @Year() private readonly year!: ResolvedAcademicYear;
  @Inject(CHATBOT_CONFIG) private readonly chatbotConfig!: ChatbotConfig;
  constructor(private classifier: JevIntentClassifier, private fixture: JevBenchmarkRepository) {}
  private async ensureEnabled() {
    if (!chatBenchmarkControlsEnabled() || !isLocalJevFixtureDatabase() || !await this.fixture.isMarkedFixture())
      Err(404, this.bt('fixtureRequired'));
  }
  async status() {
    await this.ensureEnabled();
    return { ...chatBenchmarkSnapshot(), mode: effectiveJevMode(), budget: this.classifier.ledger.snapshot(),
      syntheticOnly: true, markedLocalFixture: true, guardVersion: 5, intentWordingVersion: 3,
      threshold: this.classifier.controls.threshold, timeoutMs: this.classifier.controls.timeoutMs,
      frameworkPreparationEnabled: this.chatbotConfig.reply?.preparation?.enabled === true };
  }
  async setMode(mode: JevMode) { await this.ensureEnabled(); setBenchmarkJevMode(mode); return this.status(); }
  async issueSession(actorId: string, caseId: string) {
    await this.ensureEnabled();
    return { ...jevSessionGrants.issue(actorId, this.year.label, caseId), ...chatBenchmarkSnapshot() };
  }
  async attempts() { await this.ensureEnabled(); return this.classifier.ledger.recent(); }
}
