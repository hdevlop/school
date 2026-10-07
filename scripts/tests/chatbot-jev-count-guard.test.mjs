import { describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { accepts } from '../chatbot-jev.mjs';
import { acceptsWithCountGuard, compareCountGuard, countQueryVeto } from '../chatbot-jev-count-guard.mjs';

const decision = (choice, confidence = 0.8, writeProbability = 0.1) => ({ choice, confidence, writeProbability });

describe('offline count guard prototype', () => {
  it('abstains on the known name/list query without changing the saved decision', () => {
    const value = decision('teacher_count');
    const before = structuredClone(value);
    const query = 'وريني سميات الأساتذة ديال المدرسة، ماشي شحال عددهم.';
    expect(accepts(value, 0.8, true, 'core')).toBe(true);
    expect(acceptsWithCountGuard(value, query, 0.8)).toBe(false);
    expect(value).toEqual(before);
  });

  it('checks whole tokens, Arabic marks/tatweel and casing without matching nombre', () => {
    for (const query of ['Les NOMS des professeurs', 'List the teachers', 'أَسْمَاءُ المدرسين',
      'سـمـيـات الأساتذة', 'La liste des élèves', 'wrini SMIYAT dyal les profs']) {
      expect(countQueryVeto(query, 'teacher_count')).toBe('name_or_list_signal');
    }
    for (const query of ['Nombre total des élèves', 'Deux nombres : élèves et enseignants',
      'How many at Nameless Academy?', 'كم عدد المدرسين؟']) {
      expect(countQueryVeto(query, 'teacher_count')).toBeNull();
    }
  });

  it('leaves class lists and guarded write refusals under the original acceptance rules', () => {
    expect(acceptsWithCountGuard(decision('class_list'), 'أسماء الأقسام', 0.8)).toBe(true);
    expect(acceptsWithCountGuard(decision('write_request', 0.9, 0.9), 'Change the names', 0.8)).toBe(true);
    expect(acceptsWithCountGuard(decision('write_request'), 'Change the names', 0.8)).toBe(false);
    expect(acceptsWithCountGuard(decision('needs_llm', 1), 'Names?', 0.8)).toBe(false);
  });

  it('retains numerical, policy and write-agreement validation and missing-count-query refusal', () => {
    for (const value of [decision('teacher_count', 1.5), decision('teacher_count', 1, -0.1),
      decision('teacher_count', 0.8, 0.9), decision('unknown', 1), null]) {
      expect(acceptsWithCountGuard(value, 'Total teachers?', 0.8)).toBe(false);
    }
    for (const query of [null, undefined, '', ' ']) expect(acceptsWithCountGuard(decision('teacher_count'), query, 0.8)).toBe(false);
    expect(acceptsWithCountGuard(decision('teacher_count'), 'Total teachers?', 1.5)).toBe(false);
    expect(acceptsWithCountGuard(decision('teacher_count'), 'Total teachers?', 0.8, 'missing')).toBe(false);
  });

  it('records correct coverage losses alongside prevented false acceptances and deduplicates repetitions', () => {
    const rows = [1, 2].flatMap(repetition => [
      { repetition, item: { id: 'bad', familyId: 'names', query: 'Les noms des enseignants', intent: 'needs_llm' }, decision: decision('teacher_count') },
      { repetition, item: { id: 'good', familyId: 'count', query: 'Le nombre, pas les noms', intent: 'teacher_count' }, decision: decision('teacher_count') },
      { repetition, item: { id: 'plain', familyId: 'count-plain', query: 'Nombre total ?', intent: 'teacher_count' }, decision: decision('teacher_count') },
    ]);
    const result = compareCountGuard(rows);
    expect(result).toMatchObject({ before: { samples: 6, questions: 3, wrongQuestions: 1 },
      after: { samples: 2, questions: 1, wrongQuestions: 0 },
      preventedWrong: { samples: 2, questions: 1 }, lostCorrect: { samples: 2, questions: 1 }, productionAcceptance: false });
  });

  it('matches the explicitly synthetic dev expectations without treating them as held-out data', async () => {
    const corpus = await Bun.file('datasets/chatbot-latency/jev-count-guard-dev.json').json();
    expect(corpus.purpose).toBe('count-guard-development');
    for (const item of corpus.cases) {
      expect(item.source).toBe('assistant');
      expect(item.split).toBe('dev');
      expect(countQueryVeto(item.query, item.proposedChoice) !== null).toBe(item.expectedVeto);
    }
  });

  it('replays the real saved records with every fetch blocked and refuses output overwrite', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'school-jev-count-dev-'));
    try {
      const output = join(directory, 'study.json');
      const audit = join(directory, 'fetch.json');
      const preload = join(directory, 'offline.mjs');
      await Bun.write(preload, `import { writeFileSync } from 'node:fs';
let calls = 0;
globalThis.fetch = async () => { calls++; throw new Error('Offline replay forbids network'); };
process.on('exit', () => writeFileSync(${JSON.stringify(audit)}, JSON.stringify({ calls })));
`);
      const run = async (extra = []) => {
        const child = Bun.spawn([Bun.which('bun'), `--preload=${preload}`, resolve('scripts/chatbot-jev-count-guard-study.mjs'),
          `--output=${output}`, ...extra], { env: { ...process.env, OPENROUTER_API_KEY: '' }, stdout: 'pipe', stderr: 'pipe' });
        const [exitCode, stdout, stderr] = await Promise.all([child.exited,
          new Response(child.stdout).text(), new Response(child.stderr).text()]);
        expect(await Bun.file(audit).json()).toEqual({ calls: 0 });
        return { exitCode, stdout, stderr };
      };
      const frozen = await run();
      expect(frozen.exitCode).toBe(1);
      expect(frozen.stderr).toContain('Measured classification source changed: packages/server/src/modules/chat/schoolReplyLanguage.ts');
      expect(await Bun.file(output).exists()).toBe(false);
      expect((await run(['--current-language-profile'])).exitCode).toBe(1);
      expect(await Bun.file(output).exists()).toBe(false);
      expect((await run(['--current-reply-profile'])).exitCode).toBe(0);
      const text = await Bun.file(output).text();
      const result = JSON.parse(text);
      expect(result).toMatchObject({ parsedDecisionsReplayed: 310, originalEligibilityAndAcceptanceReproduced: false,
        languageProfile: 'current-post-result', replyProfile: 'current-post-result',
        changedMeasuredSources: ['packages/server/src/modules/chat/schoolReplyLanguage.ts',
          'packages/server/src/modules/chat/schoolReplyTemplates.ts', 'packages/server/src/modules/chat/schoolReplyWrite.ts'],
        originalMeasuredAcceptance: { questions: 50, wrongQuestions: 1 }, historicalRawReportsChanged: false,
        liveProviderRequests: 0, productionAcceptance: false, runtimeGuardEnabled: false });
      expect(result.comparison.before.questions).toBeGreaterThanOrEqual(50);
      expect(result.comparison).toMatchObject({ before: { wrongQuestions: 1 },
        after: { wrongQuestions: 0 }, lostCorrect: { questions: 3, samples: 9 } });
      expect((await run()).exitCode).toBe(1);
      expect(await Bun.file(output).text()).toBe(text);
    } finally {
      if (dirname(directory) !== resolve(tmpdir()) || !basename(directory).startsWith('school-jev-count-dev-')) throw new Error('Invalid cleanup target');
      await rm(directory, { recursive: true, force: true });
    }
  });
});
