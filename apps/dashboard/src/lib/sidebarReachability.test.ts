import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every dashboard route must offer a way to open the sidebar on mobile.
 *
 * Below the `lg` breakpoint the sidebar is a drawer, and the only way in is a
 * trigger on the page. `NPageHeader` renders one automatically from the
 * `NSidebarProvider` context, so almost every route gets it for free — which is
 * exactly why the exceptions are easy to miss. A route whose shell is a plain
 * `div` renders no trigger and no error, and nothing about it looks wrong on a
 * desktop screen.
 *
 * This is not hypothetical either: the Phase 2 migration dropped `NSidebar`'s
 * own `showHamburgerButton`, which had been covering three headerless routes.
 * The fix was an explicit `useNSidebar()?.openMobile()` button on each. This
 * test walks each route's import graph so the next headerless page fails here
 * rather than on someone's phone.
 */
const dashboardSrc = fileURLToPath(new URL('../', import.meta.url));
const routesDir = join(dashboardSrc, 'app', '(dashboard)');

/**
 * Routes that legitimately render no trigger.
 *
 * Keep this list tiny and justified. A product screen does not belong here.
 */
const EXEMPT = new Map([
  ['drivers/page.tsx', 'redirects to /staff and renders nothing'],
  ['test/page.tsx', 'developer-only NBadge preview, not a product route'],
]);

function routeFiles(dir: string, prefix = ''): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      found.push(...routeFiles(join(dir, entry.name), rel));
    } else if (entry.name === 'page.tsx') {
      found.push(rel);
    }
  }
  return found;
}

function resolveImport(spec: string, importer: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) {
    base = join(dashboardSrc, spec.slice(2));
  } else if (spec.startsWith('.')) {
    base = normalize(resolvePath(dirname(importer), spec));
  } else {
    return null;
  }

  for (const candidate of [
    `${base}.tsx`,
    `${base}.ts`,
    join(base, 'index.tsx'),
    join(base, 'index.ts'),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Whether a route's import graph renders a page header or an explicit trigger. */
function hasSidebarTrigger(entry: string, maxDepth = 6): boolean {
  const seen = new Set<string>();
  const stack: Array<{ file: string; depth: number }> = [{ file: entry, depth: 0 }];

  while (stack.length) {
    const { file, depth } = stack.pop()!;
    if (seen.has(file) || depth > maxDepth) continue;
    seen.add(file);

    let source: string;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    if (source.includes('<NPageHeader') || source.includes('openMobile')) return true;

    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const resolved = resolveImport(match[1], file);
      if (resolved) stack.push({ file: resolved, depth: depth + 1 });
    }
  }

  return false;
}

describe('mobile sidebar reachability', () => {
  const routes = routeFiles(routesDir).sort();

  test('finds the dashboard routes', () => {
    // A resolution bug that returned nothing would make every other assertion
    // below pass silently.
    expect(routes.length).toBeGreaterThan(30);
    expect(routes).toContain('students/page.tsx');
  });

  test('every route renders a page header or its own trigger', () => {
    const unreachable = routes
      .filter((route) => !EXEMPT.has(route))
      .filter((route) => !hasSidebarTrigger(join(routesDir, route)));

    expect(unreachable).toEqual([]);
  });

  test('the exemptions still describe the routes they claim to', () => {
    for (const route of EXEMPT.keys()) {
      // An exemption for a route that no longer exists is a stale license for
      // whatever takes its path later.
      expect(routes).toContain(route);
    }
    expect(readFileSync(join(routesDir, 'drivers/page.tsx'), 'utf8')).toContain('redirect(');
  });
});
