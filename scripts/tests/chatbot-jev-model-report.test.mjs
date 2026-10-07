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
