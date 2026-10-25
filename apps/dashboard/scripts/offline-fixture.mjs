import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GET } from '../src/app/sw.js/route';
import { createNajmServiceWorker } from 'najm-next/pwa';
import { SHELL_PATHS } from '../src/offline/routes';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
process.chdir(appRoot);
const navigationProof = await Bun.build({ entrypoints: [resolve(appRoot, 'tests/offline/fixtures/navigation.tsx')],
  target: 'browser', minify: true, define: { 'process.env.NODE_ENV': '"production"' } });
if (!navigationProof.success) throw new AggregateError(navigationProof.logs, 'Navigation fixture build failed');
const navigationScript = await navigationProof.outputs[0].text();
const preparationProof = await Bun.build({ entrypoints: [resolve(appRoot, 'tests/offline/fixtures/preparation.ts')], target: 'browser', minify: true });
if (!preparationProof.success) throw new AggregateError(preparationProof.logs, 'Preparation fixture build failed');
const preparationScript = await preparationProof.outputs[0].text();
const manifest = await Bun.file(resolve(appRoot, 'public/offline-shell/manifest.json')).json();
const stats = { missingRequests: 0, assetRequests: 0, bytesServed: 0 };
let installMode = 'shell';
let missingAsset = process.env.OFFLINE_MISSING_ASSET === '1';
let assetDelayMs = 0;
const server = Bun.serve({ hostname: '127.0.0.1', port: Number(process.env.OFFLINE_FIXTURE_PORT ?? 0), idleTimeout: 30, async fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === '/navigation-proof' || path === '/navigation-proof/other') return new Response('<!doctype html><div id="root"></div><script type="module" src="/navigation-proof.js"></script>', { headers: { 'Content-Type': 'text/html' } });
  if (path === '/navigation-proof.js') return new Response(navigationScript, { headers: { 'Content-Type': 'application/javascript' } });
  if (path === '/preparation-proof.js') return new Response(preparationScript, { headers: { 'Content-Type': 'application/javascript' } });
  if (path === '/install-stats') return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
  if (path === '/install-control' && request.method === 'POST') {
    const options = await request.json();
    installMode = options.mode ?? installMode;
    missingAsset = options.missing ?? missingAsset;
    assetDelayMs = options.delayMs ?? assetDelayMs;
    return Response.json({ installMode, missingAsset, assetDelayMs });
  }
  if (path === '/sw.js' && installMode !== 'legacy') return GET();
  // Model the previous public contract: only an inline reconnect document.
  if (path === '/sw-legacy.js' || path === '/sw.js') return createNajmServiceWorker({ cacheId: 'myscolai-shell',
    offlineDocument: { title: 'MyScolAI is offline', description: 'Reconnect to the internet, then try loading this page again.' },
  })();
  if (path === '/sw-next.js') {
    const manifest = await Bun.file(resolve(appRoot, 'public/offline-shell/manifest.json')).json();
    return createNajmServiceWorker({ cacheId: 'myscolai-shell', cacheVersion: manifest.version + '-next', offlineUrl: manifest.document,
      precache: manifest.assets, navigationFallback: { paths: [...SHELL_PATHS] }, updatePolicy: 'staged' })();
  }
  if (path === '/api/health/status') return Response.json({ status: 'ok' });
  if (path === '/students/slow') { await new Promise(resolve => setTimeout(resolve, 12000)); return new Response('Slow online document'); }
  if ((path.startsWith('/offline-shell/') || manifest.assets.includes(path)) && !path.includes('..')) {
    if (path === manifest.assets.at(-1)) {
      if (assetDelayMs) await new Promise(resolve => setTimeout(resolve, assetDelayMs));
      if (missingAsset) {
        stats.missingRequests++;
        return new Response('Injected missing shell asset', { status: 404, headers: { 'Cache-Control': 'no-store' } });
      }
    }
    const file = Bun.file(resolve(appRoot, 'public' + path));
    stats.assetRequests++; stats.bytesServed += file.size;
    return new Response(file, { headers: { 'Cache-Control': process.env.OFFLINE_ASSET_CACHE_CONTROL ?? 'public, max-age=31536000, immutable' } });
  }
  if (path === '/fixture.html') return new Response('<!doctype html><title>Preparation</title>', { headers: { 'Content-Type': 'text/html' } });
  // Documents outside the shell, for the unlisted-page fallback test.
  const page = (heading, status = 200) => new Response(`<!doctype html><title>${heading}</title><h1>${heading}</h1>`, { status, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' } });
  if (['/', '/welcome', '/login', '/register', '/forgot-password', '/reset-password', '/change-password', '/public-page', '/academic-year-migration'].includes(path)) return page('Online ' + path);
  if (path === '/missing-page') return page('Missing page', 404);
  if (path === '/students') return Response.redirect(new URL('/login?next=%2Fstudents', request.url), 307);
  if (path === '/download.csv') return new Response('a,b', { headers: { 'Content-Disposition': 'attachment; filename=export.csv' } });
  return new Response('Network unavailable', { status: 503 });
} });
console.log(server.url.href);
