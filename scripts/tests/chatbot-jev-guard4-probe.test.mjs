import { expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';

async function runProbe(validate) {
  const args = ['--cases=datasets/chatbot-latency/jev-fresh-stress304-20261007.json',
    '--acceptance-policy=core', '--query-guard-version=4', '--connection-reuse=off',
    ...(validate ? ['--validate'] : ['--repetitions=1', '--max-requests=304', '--budget-usd=0.05', '--request-reserve-usd=0.00015'])];
  const code = `globalThis.fetch = () => { throw new Error('Unexpected network call'); };
    process.argv = ['bun', 'probe', ...${JSON.stringify(args)}];
    await import(${JSON.stringify(new URL('../chatbot-jev-probe.mjs', import.meta.url).href)});`;
  const process = Bun.spawn(['bun', '--eval', code], { cwd: fileURLToPath(new URL('../../', import.meta.url)),
    stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([new Response(process.stdout).text(),
    new Response(process.stderr).text(), process.exited]);
  return { stdout, stderr, exitCode };
}

test('v4 probe validates pending wording offline', async () => {
  const result = await runProbe(true);
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ valid: true, queryGuardVersion: 4, cases: 304 });
  expect(JSON.parse(result.stdout).freshness.operatorWorkflow.languageReviewComplete).toBe(false);
});

test('selecting v4 does not bypass pending wording approval or dispatch requests', async () => {
  const result = await runProbe(false);
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain('Confirm the drafted Darija wording before paid classification');
  expect(result.stderr).not.toContain('Unexpected network call');
});
