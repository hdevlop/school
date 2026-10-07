import { writeFile } from 'node:fs/promises';

const endpoint = 'https://openrouter.ai/api/v1/models/typesafe/jev-1.13/endpoints';
const methods = ['bun-default', 'bun-no-reuse', 'curl-new-process'];
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const percentile = (values, p) => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] : null;

export function summarizeTransport(rows) {
  return Object.fromEntries(methods.map(method => {
    const selected = rows.filter(row => row.method === method);
    const successful = selected.filter(row => !row.error && row.status === 200);
    const times = successful.map(row => row.totalMs);
    return [method, { attempts: selected.length, successful: successful.length,
      failures: selected.length - successful.length, meanMs: mean(times),
      p50Ms: percentile(times, 0.5), p95Ms: percentile(times, 0.95),
      maximumMs: times.length ? Math.max(...times) : null }];
  }));
}

async function sample(method, sequence, block) {
  const started = performance.now();
  try {
    if (method === 'curl-new-process') {
      const child = Bun.spawn(['curl.exe', '--silent', '--show-error', '--max-time', '10',
        '--output', 'NUL', '--write-out', '%{json}', endpoint], { stdout: 'pipe', stderr: 'pipe' });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      let timing;
      try { timing = JSON.parse(stdout); } catch { throw new Error(`curl returned no timing JSON (exit ${exitCode})`); }
      return { method, sequence, block, status: timing.http_code, totalMs: timing.time_total * 1000,
        processWallMs: performance.now() - started, bytes: timing.size_download,
        httpVersion: timing.http_version, connectionsCreated: timing.num_connects,
        dnsMs: timing.time_namelookup * 1000,
        tcpMs: Math.max(0, timing.time_connect - timing.time_namelookup) * 1000,
        tlsMs: Math.max(0, timing.time_appconnect - timing.time_connect) * 1000,
        afterSetupToFirstByteMs: Math.max(0, timing.time_starttransfer - timing.time_pretransfer) * 1000,
        exitCode, error: exitCode ? stderr.trim() || `curl exit ${exitCode}` : null };
    }
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(10_000),
      ...(method === 'bun-no-reuse' ? { keepalive: false } : {}) });
    const firstResponseMs = performance.now() - started;
    const body = await response.arrayBuffer();
    return { method, sequence, block, status: response.status, bytes: body.byteLength,
      totalMs: performance.now() - started, firstResponseMs, error: null };
  } catch (error) {
    return { method, sequence, block, status: null, totalMs: performance.now() - started,
      error: error.message, code: error.cause?.code ?? error.code ?? null };
  }
}

async function main() {
  const out = process.argv.find(value => value.startsWith('--out='))?.slice(6);
  if (!out) throw new Error('Required: --out=NEW_REPORT.json');
  // Refuse to overwrite previous evidence. No credentials, classification POSTs or retries.
  const handle = await Bun.file(out).exists();
  if (handle) throw new Error('Output already exists');
  const versionProcess = Bun.spawn(['curl.exe', '--version'], { stdout: 'pipe' });
  const curlVersion = await new Response(versionProcess.stdout).text();
  if (await versionProcess.exited) throw new Error('curl.exe is unavailable');
  const report = { startedAt: new Date().toISOString(), endpoint, classificationRequests: 0,
    authenticatedRequests: 0, paidAllowanceConsumed: 0, bunVersion: Bun.version, curlVersion,
    design: { blocks: 12, samplesPerMethod: 12, timeoutMs: 10_000, paceMs: 1000,
      order: 'Alternating forward/reverse blocks, rotated start every two blocks', retries: 0,
      limitation: 'Public cached metadata GET; not authenticated Jev compute or end-to-end chat. Small sequential cohort, not a causal provider comparison.' },
    rows: [] };
  await writeFile(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  for (let block = 0; block < 12; block++) {
    const rotated = methods.map((_, index) => methods[(index + Math.floor(block / 2)) % methods.length]);
    const order = block % 2 ? rotated.reverse() : rotated;
    for (const method of order) {
      report.rows.push(await sample(method, report.rows.length + 1, block + 1));
      // Persist partial evidence immediately; a crash does not hide failed slots.
      await writeFile(out, JSON.stringify(report, null, 2) + '\n');
      await Bun.sleep(report.design.paceMs);
    }
  }
  report.completedAt = new Date().toISOString();
  report.summary = summarizeTransport(report.rows);
  await writeFile(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ out, summary: report.summary, classificationRequests: 0 }, null, 2));
}

if (import.meta.main) await main();
