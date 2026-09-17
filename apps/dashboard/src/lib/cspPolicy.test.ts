import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { POST } from '../app/api/csp-report/route';
import { createNajmCsp, createNajmNonce } from 'najm-next/security';
import { defineNajmAppLocationRuntime } from 'najm-next/location/server';
import {
  readNajmBoundedJson,
  sanitizeNajmCspReports,
} from 'najm-next/security/reports';
import { schoolApp } from '../najm.config';

const dashboardRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const read = (path: string) => readFileSync(join(dashboardRoot, path), 'utf8');
const schoolLocation = defineNajmAppLocationRuntime(schoolApp)!;

describe('the per-request content security policy', () => {
  const nonce = 'dGVzdC1ub25jZQ==';
  const createPolicy = (nonceValue: string, isDevelopment: boolean) =>
    createNajmCsp(nonceValue, {
      mode: 'nonce',
      isDevelopment,
      app: schoolApp,
      locationCsp: schoolLocation.resolve({
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'public-browser-key',
      }).csp,
    });
  const policy = createPolicy(nonce, false);

  test('blocks unsafe defaults while allowing the Google Maps integration', () => {
    for (const directive of [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "worker-src 'self' blob:",
      'upgrade-insecure-requests',
      'report-uri /api/csp-report',
    ]) {
      expect(policy).toContain(directive);
    }

    expect(policy).toContain('https://*.googleapis.com');
    expect(policy).toContain('https://*.gstatic.com');
  });

  test('authorizes scripts through a fresh nonce', () => {
    const scriptSrc = policy
      .split(';')
      .find((part) => part.trim().startsWith('script-src'));

    expect(scriptSrc).toContain(`'nonce-${nonce}'`);
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(createPolicy(nonce, true)).toContain("'unsafe-eval'");
  });

  test('generates unique valid nonces and rejects directive injection', () => {
    const first = createNajmNonce();
    const second = createNajmNonce();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(() =>
      createPolicy("bad'; script-src *", false),
    ).toThrow();
  });

  test('forwards the policy and nonce into server rendering', () => {
    const proxy = read('src/proxy.ts');
    const instrumentation = read('src/instrumentation-client.ts');

    expect(proxy).toContain('composeNajmProxy');
    expect(proxy).not.toContain('resolveLocationCsp');
    expect(instrumentation).toContain("import 'najm-next/instrumentation/client'");
  });
});

describe('the CSP report sink', () => {
  test('removes query strings that could contain reset or session tokens', () => {
    const [report] = sanitizeNajmCspReports({
      'csp-report': {
        'document-uri':
          'https://myscolai.com/reset-password?token=SECRET-RESET-TOKEN#fragment',
        'effective-directive': 'script-src',
        'blocked-uri': 'https://evil.test/x?session=SECRET-SESSION',
      },
    });

    expect(report.documentUri).toBe('https://myscolai.com');
    expect(JSON.stringify(report)).not.toContain('SECRET-RESET-TOKEN');
    expect(JSON.stringify(report)).not.toContain('SECRET-SESSION');
  });

  test('stops reading a streamed request after the 8 KiB limit', async () => {
    let produced = 0;
    let cancelled = false;
    const chunk = new TextEncoder().encode('z'.repeat(4_096));
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        produced += chunk.byteLength;
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request('https://myscolai.com/api/csp-report', {
      method: 'POST',
      body,
      // @ts-expect-error -- Bun requires duplex for a streaming request body.
      duplex: 'half',
    });

    expect(await readNajmBoundedJson(request)).toBeNull();
    expect(cancelled).toBe(true);
    expect(produced).toBeLessThanOrEqual(16_384);
  });

  test('returns the same empty response for malformed reports', async () => {
    const response = await POST(
      new Request('https://myscolai.com/api/csp-report', {
        method: 'POST',
        body: 'not json',
      }),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
});
