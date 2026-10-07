import { expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('model report matches individual generation windows and keeps missing charges unknown', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'school-model-report-'));
  const runPath = join(dir, 'run.json'), usagePath = join(dir, 'usage.jsonl'), outPath = join(dir, 'report.json');
  const row = (model, start, end, correlationId) => ({ model, mode: 'on', caseId: 'count', correlationId,
    startedAt: start, completedAt: end, expectedIntent: 'student_count',
    done: true, errors: [], aborted: false, firstTextMs: 10, completionMs: 20, text: '8 students',
    diagnostics: { model, reply: { source: 'model' }, tools: [], steps: [{}] } });
  try {
    writeFileSync(runPath, JSON.stringify({ status: 'completed', chatsDispatched: 2,
      protocol: { purpose: 'two-model-jev-parallel-comparison', models: ['120b', '20b'] },
      rows: [row('120b', '2026-10-07T12:00:00Z', '2026-10-07T12:00:01Z', 'first'),
        row('20b', '2026-10-07T12:00:02Z', '2026-10-07T12:00:03Z', 'second')],
      attempts: [{ correlationId: 'first', costUsd: 0.01, selected: 'ordinary', choice: 'student_count' }] }));
    writeFileSync(usagePath, [
      { generationId: 'gen-1', startedAt: '2026-10-07T12:00:00.100Z', model: '120b', provider: 'host1', usage: { cost: 0.02 } },
      { generationId: 'gen-2', startedAt: '2026-10-07T12:00:02.100Z', model: '20b', provider: 'host2', usage: {} },
    ].map(call => JSON.stringify(call)).join('\n'));
    const command = [process.execPath, 'scripts/chatbot-jev-model-report.mjs', runPath, usagePath, outPath];
    const child = Bun.spawn(command, { stdout: 'pipe', stderr: 'pipe' });
    expect(await child.exited).toBe(0);
    const report = JSON.parse(readFileSync(outPath, 'utf8'));
    expect(report.rows[0].totalReportedCostUsd).toBe(0.03);
    expect(report.rows[1].totalReportedCostUsd).toBeNull();
    expect(report.arms.find(arm => arm.model === '20b' && arm.mode === 'on').projectedCostPer1000SimilarChatsUsd).toBeNull();
    expect(report.unaccountedGenerationIds).toEqual([]);
    const overwrite = Bun.spawn(command, { stdout: 'pipe', stderr: 'pipe' });
    expect(await overwrite.exited).not.toBe(0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('first and parallel arms of the same model stay separate, including zero-generation templates', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'school-first-report-'));
  try {
    const runPath = join(dir, 'run.json'), usagePath = join(dir, 'usage.jsonl'), outPath = join(dir, 'out.json');
    const arms = ['parallel', 'first'].map(strategy => ({ experimentArm: strategy, model: '20b', mode: 'on',
      provider: 'coreweave-only', strategy }));
    writeFileSync(runPath, JSON.stringify({ status: 'completed', chatsDispatched: 2,
      protocol: { purpose: 'coreweave-jev-first-comparison', models: ['20b'], arms },
      rows: arms.map((arm, i) => ({ ...arm, caseId: 'count', correlationId: arm.experimentArm,
        startedAt: `2026-10-08T12:00:0${i * 2}Z`, completedAt: `2026-10-08T12:00:0${i * 2 + 1}Z`,
        expectedIntent: 'student_count', done: true, errors: [], aborted: false, firstTextMs: 10,
        completionMs: 20, text: '8 students', diagnostics: { model: '20b', tools: [], steps: i ? [] : [{}],
          reply: { source: i ? 'template' : 'model', label: i ? 'jev:student_count' : undefined } } })),
      attempts: arms.map(arm => ({ correlationId: arm.experimentArm, costUsd: 0.00004,
        selected: arm.strategy === 'first' ? 'template' : 'ordinary', choice: 'student_count' })) }));
    writeFileSync(usagePath, JSON.stringify({ generationId: 'gen-only', startedAt: '2026-10-08T12:00:00.100Z',
      model: '20b', provider: 'CoreWeave', usage: { cost: 0.0002 } }) + '\n');
    const child = Bun.spawn([process.execPath, 'scripts/chatbot-jev-model-report.mjs', runPath, usagePath, outPath], { stdout: 'pipe', stderr: 'pipe' });
    expect(await child.exited).toBe(0);
    const report = JSON.parse(readFileSync(outPath, 'utf8'));
    expect(report.arms).toHaveLength(2);
    expect(report.arms[0].generationCalls).toBe(1);
    expect(report.arms[1]).toMatchObject({ generationCalls: 0, jevTemplates: 1, totalReportedCostUsd: 0.00004,
      reportedCostComplete: true, providerPolicyViolations: 0 });
    expect(report.classifier.acceptedWrong).toBe(0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
