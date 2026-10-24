// Sidebar logos are served by the API, which the worker never caches. School
// keeps its own copy for the offline shell; Najm's shell caches are untouched.
export const SHELL_BRANDING_CACHE = 'school-offline-branding';
export const SHELL_LOGO_SLOTS = ['sidebarLogoExpanded', 'sidebarLogoCollapsed'] as const;

type Branding = { slots?: Readonly<Record<string, string | null>> };

function logoUrls(branding: Branding | undefined, origin: string): string[] {
  return [...new Set(SHELL_LOGO_SLOTS.flatMap(slot => {
    const path = branding?.slots?.[slot];
    if (!path) return [];
    const url = new URL(path, origin);
    return url.origin === origin ? [url.href] : [];
  }))];
}

// Factory logos are named by a hash of their bytes and uploads by a fresh id,
// so a URL there never serves other bytes: a replaced logo is a new URL.
const IMMUTABLE_LOGO = /^\/api\/branding\/(?:factory|assets)\//;

/** Online: store the school's current sidebar logos for the offline shell. */
export async function cacheShellBranding(branding: Branding | undefined, origin = location.origin,
  storage: Pick<CacheStorage, 'open'> = caches, request: typeof fetch = fetch) {
  const urls = logoUrls(branding, origin);
  const cache = await storage.open(SHELL_BRANDING_CACHE);
  let complete = true;
  let downloaded = false;
  for (const url of urls) {
    // Each signed-in page runs this: a stored immutable logo is already current.
    if (IMMUTABLE_LOGO.test(new URL(url).pathname) && await cache.match(url)) continue;
    try {
      const response = await request(url, { cache: 'no-cache' });
      if (response.ok && (response.headers.get('content-type') ?? '').startsWith('image/')) { await cache.put(url, response); downloaded = true; }
      else complete = false;
    } catch { complete = false; }
  }
  // Drop a replaced logo only once every current one is stored.
  if (complete && downloaded) for (const key of await cache.keys()) if (!urls.includes(key.url)) await cache.delete(key);
}

/** Offline: point the sidebar logo slots at the stored copies. */
export async function withCachedBranding<T extends Branding>(branding: T, origin = location.origin,
  storage: Pick<CacheStorage, 'open'> = caches): Promise<T> {
  const cache = await storage.open(SHELL_BRANDING_CACHE);
  const slots: Record<string, string | null> = { ...branding.slots };
  for (const slot of SHELL_LOGO_SLOTS) {
    const path = slots[slot];
    const cached = path ? await cache.match(new URL(path, origin).href) : undefined;
    if (cached) slots[slot] = URL.createObjectURL(await cached.blob());
  }
  return { ...branding, slots } as T;
}
