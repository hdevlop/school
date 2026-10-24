// Production-built asset/worker proof. No school database or real accounts used.
import { chromium, firefox, webkit } from 'playwright';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createOfflineProfile } from './offline-profile.mjs';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
process.chdir(appRoot);
const child = process.env.OFFLINE_ORIGIN ? null : spawn('bun', ['scripts/offline-fixture.mjs'], { cwd: appRoot, stdio: ['ignore', 'pipe', 'inherit'] });
const origin = process.env.OFFLINE_ORIGIN ?? await new Promise((resolve, reject) => {
  const timer = setTimeout(() => { child.kill(); reject(new Error('Fixture startup timed out')); }, 15000);
  child.once('error', reject);
  child.stdout.once('data', chunk => { clearTimeout(timer); resolve(chunk.toString().trim()); });
});
const server = { url: origin };
const preparation = process.env.OFFLINE_ORIGIN
  ? (await (await fetch(new URL('offline-shell/manifest.json', origin))).json()).document.slice(1)
  : 'fixture.html';
try {
  for (const name of (process.env.OFFLINE_BROWSERS ?? 'chromium').split(',')) {
    const engine = ({ chromium, firefox, webkit })[name];
    const profile = await createOfflineProfile(resolve(appRoot, '../../.cache'), `offline-${name}-`, name);
    let context = await engine.launchPersistentContext(profile, { headless: true });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      page.setDefaultNavigationTimeout(20000);
      const errors = [];
      page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
      page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
      await page.goto(server.url + preparation);
      await page.evaluate(async () => {
        localStorage.setItem('school.offline-shell.v1', JSON.stringify({ version: 1, accountId: 'fixture', role: 'admin', academicYear: '2026-2027', expiresAt: Date.now() + 3600000,
          routes: [{ href: '/students', label: 'Students' }, { href: '/classes', label: 'Classes' }],
          ui: { app: { appName: 'MyScolAI' }, preferences: { language: 'en', theme: 'light', timeZone: 'Africa/Casablanca' }, appearance: { designConfig: {} },
            branding: { slots: { sidebarLogoExpanded: '/api/theme/branding/fixture-logo.png' } } },
        }));
        // What OfflinePreparation stores online: the API-served sidebar logo.
        const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
        await (await caches.open('school-offline-branding')).put('/api/theme/branding/fixture-logo.png', new Response(png, { headers: { 'Content-Type': 'image/png' } }));
        const registration = await navigator.serviceWorker.register('/sw.js');
        await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Worker not ready: ' + registration.installing?.state)), 15000))]);
      });
      console.log(`${name}: worker ready`);
      await context.setOffline(true);
      await page.goto(server.url + 'students/fixture-id');
      console.log(`${name}: offline document loaded`);
      await page.getByText('School data is not available offline yet.', { exact: false }).waitFor();
      await page.getByRole('button', { name: /back to students/i }).waitFor();
      // The online sidebar offline: feature icons, groups and the stored school logo.
      if (!await page.getByRole('link', { name: 'Students', exact: true }).locator('svg').count()) throw new Error('Offline sidebar entry has no icon');
      await page.getByRole('button', { name: 'Academic', exact: true }).waitFor();
      const logos = await page.evaluate(() => Promise.all([...document.querySelectorAll('img[alt="MyScolAI"]')].filter(image => image.getClientRects().length)
        .map(async image => { await image.decode().catch(() => undefined); return { src: image.getAttribute('src'), width: image.naturalWidth }; })));
      if (!logos.length || logos.some(logo => !logo.src?.startsWith('blob:') || !logo.width)) throw new Error('Offline sidebar did not show the stored logo: ' + JSON.stringify(logos));
      if (!await page.locator('meta[http-equiv="Content-Security-Policy"]').count()) throw new Error('Cached document has no CSP');
      const styling = await page.evaluate(() => {
        const flags = ['us', 'fr', 'es', 'ma', 'xx'].map(code => {
          const flag = document.createElement('span'); flag.className = 'fi fi-' + code; document.body.append(flag);
          const background = getComputedStyle(flag).backgroundImage; flag.remove(); return background;
        });
        const theme = document.createElement('div'); theme.className = 'najm-theme-settings'; document.body.append(theme);
        const leaflet = document.createElement('div'); leaflet.className = 'leaflet-container'; document.body.append(leaflet);
        const utility = document.createElement('div'); utility.className = 'flex'; document.body.append(utility);
        const result = { flags, theme: getComputedStyle(theme).display, leaflet: getComputedStyle(leaflet).overflow, utility: getComputedStyle(utility).display };
        theme.remove(); leaflet.remove(); utility.remove(); return result;
      });
      if (styling.flags.slice(0, 4).some(value => value === 'none') || styling.flags[4] !== 'none' || styling.theme !== 'flex' || styling.leaflet !== 'hidden' || styling.utility !== 'flex') throw new Error('Incomplete offline CSS: ' + JSON.stringify(styling));
      await page.evaluate(async backgrounds => {
        await Promise.all(backgrounds.slice(0, 4).map(async background => {
          if (!background.includes('/offline-shell/flag-') || background.includes('data:')) throw new Error('Flag was not emitted as a separate public file');
          const image = new Image(); image.src = background.slice(5, -2); await image.decode();
        }));
      }, styling.flags);
      await page.screenshot({ path: resolve(appRoot, `../../.cache/offline-profile-${name}.png`) });
      await page.getByRole('button', { name: /back to students/i }).click();
      await page.waitForURL('**/students');
      await page.goto(server.url + 'students/fixture-id');
      await page.reload();
      await page.getByRole('heading', { name: 'Students', exact: true }).waitFor();
      if (!process.env.OFFLINE_ORIGIN) {
        await context.setOffline(false);
        const proof = await context.newPage();
        await proof.goto(server.url + 'navigation-proof');
        await proof.getByRole('button', { name: 'Rerender' }).click();
        await proof.waitForFunction(() => document.documentElement.dataset.tick === '1');
        if (!await proof.evaluate(() => document.documentElement.dataset.searchSame === 'true' && document.documentElement.dataset.routerSame === 'true')) throw new Error('Navigation objects changed on an unrelated render');
        await proof.getByRole('button', { name: 'Change query' }).click();
        await proof.waitForFunction(() => document.documentElement.dataset.query === 'one');
        if (!await proof.evaluate(() => document.documentElement.dataset.searchSame === 'false' && document.documentElement.dataset.routerSame === 'true')) throw new Error('Query did not update independently of the router');
        await proof.getByRole('button', { name: 'Change path' }).click();
        await proof.waitForFunction(() => document.documentElement.dataset.pathname.endsWith('/other'));
        if (!await proof.evaluate(() => document.documentElement.dataset.searchSame === 'true' && document.documentElement.dataset.routerSame === 'true')) throw new Error('Path change recreated unchanged query/router objects');
        await proof.close();
        await page.goto(server.url + 'students/slow');
        await page.getByText('The server is reachable.', { exact: false }).waitFor();
        const other = await context.newPage();
        await other.goto(server.url + 'classes');
        await other.getByRole('heading', { name: 'Classes', exact: true }).waitFor();
        await page.evaluate(() => {
          const form = document.createElement('form');
          form.id = 'dirty-proof'; form.innerHTML = '<input aria-label="Unsaved proof">'; document.body.append(form);
          const controls = document.createElement('div');
          controls.innerHTML = '<input id="inline-proof" aria-label="Inline edit"><div data-ntable-desktop-filters><input aria-label="Table search"></div><input type="search" aria-label="Standalone search">';
          document.body.append(controls);
        });
        await page.getByRole('textbox', { name: 'Unsaved proof' }).fill('keep this draft');
        await page.getByRole('textbox', { name: 'Inline edit' }).fill('keep inline draft');
        await page.getByRole('textbox', { name: 'Table search' }).fill('search only');
        await page.getByRole('searchbox', { name: 'Standalone search' }).fill('view query');
        await page.evaluate(async () => {
          const registration = await navigator.serviceWorker.register('/sw-next.js');
          if (!registration.waiting) await new Promise(resolve => {
            const worker = registration.installing;
            if (!worker) return resolve();
            worker.addEventListener('statechange', () => { if (worker.state === 'installed') resolve(); });
          });
        });
        await page.getByRole('button', { name: 'Update application' }).waitFor({ timeout: 25000 });
        await page.getByRole('button', { name: 'Update application' }).click();
        await page.getByText('Save or discard open changes', { exact: false }).waitFor();
        if (await page.getByRole('textbox', { name: 'Unsaved proof' }).inputValue() !== 'keep this draft') throw new Error('Draft lost during blocked update');
        await page.evaluate(() => document.getElementById('dirty-proof').reset());
        await page.getByRole('button', { name: 'Update application' }).click();
        await page.getByText('Save or discard open changes', { exact: false }).waitFor();
        if (await page.getByRole('textbox', { name: 'Inline edit' }).inputValue() !== 'keep inline draft') throw new Error('Inline edit lost or ignored during update');
        // Unmounted editors must no longer block, while searches stay populated.
        await page.evaluate(() => document.getElementById('inline-proof').remove());
        // A custom editor may not emit input/change. Its open form remains
        // protected even after a native reset, until it is closed.
        await page.getByRole('button', { name: 'Update application' }).click();
        await page.getByText('Save or discard open changes', { exact: false }).waitFor();
        await page.evaluate(() => document.getElementById('dirty-proof').remove());
        await page.evaluate(() => sessionStorage.setItem('school-grade-drafts', JSON.stringify({ state: { drafts: { fixture: { student: { marksObtained: 12 } } } } })));
        await page.getByRole('button', { name: 'Update application' }).click();
        await page.getByText('Save or discard open changes', { exact: false }).waitFor();
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Update application' && !button.disabled));
        await page.evaluate(() => sessionStorage.removeItem('school-grade-drafts'));
        await page.getByRole('button', { name: 'Update application' }).click();
        await page.getByRole('button', { name: 'Update application' }).waitFor({ state: 'hidden' });
        if (await page.getByRole('textbox', { name: 'Table search' }).inputValue() !== 'search only') throw new Error('Search state lost during activation');
        await other.close();
        await context.setOffline(true);
      }
      // Classes sits in the Academic group, collapsed as it is online.
      await page.getByRole('button', { name: 'Academic', exact: true }).click();
      await page.getByRole('link', { name: 'Classes', exact: true }).click();
      await page.getByRole('heading', { name: 'Classes', exact: true }).waitFor();
      await page.screenshot({ path: resolve(appRoot, `../../.cache/offline-${name}.png`) });
      await page.goBack();
      await page.getByRole('heading', { name: 'Students', exact: true }).waitFor();
      await page.close();
      await context.close();
      context = await engine.launchPersistentContext(profile, { headless: true });
      await context.setOffline(true);
      const reopened = await context.newPage();
      reopened.on('requestfailed', request => console.error('Failed request:', request.url(), request.failure()?.errorText));
      await reopened.goto(server.url + 'classes');
      await reopened.getByRole('heading', { name: 'Classes', exact: true }).waitFor();
      console.log(`${name}: restarted at ${new URL(reopened.url()).pathname}`);
      if (!process.env.OFFLINE_ORIGIN) {
        await reopened.evaluate(() => {
          const bootstrap = JSON.parse(localStorage.getItem('school.offline-shell.v1'));
          bootstrap.ui.preferences.language = 'ar';
          localStorage.setItem('school.offline-shell.v1', JSON.stringify(bootstrap));
          dispatchEvent(new StorageEvent('storage', { key: 'school.offline-shell.v1' }));
        });
        await reopened.reload();
        await reopened.waitForFunction(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'ar');
      }
      await reopened.evaluate(() => {
        localStorage.removeItem('school.offline-shell.v1');
        // Simulate the storage notification an account switch in another tab sends.
        dispatchEvent(new StorageEvent('storage', { key: 'school.offline-shell.v1' }));
      });
      await reopened.getByRole('link', { name: 'Sign in' }).waitFor();
      if (errors.length) throw new Error(errors.join('\n'));
      console.log(`${name}: PASS StudentProfile mount/router, sidebar icons/groups/stored logo, offline refresh/restart, cleared bootstrap${process.env.OFFLINE_ORIGIN ? '' : ', RTL, slow-online fallback, stable navigation objects, search/inline/detached editor update consent'}`);
      await context.close();
    } finally { await context.close(); }
  }
} finally { child?.kill(); }
