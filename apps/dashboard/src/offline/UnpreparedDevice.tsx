'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { SHELL_BRANDING } from './bootstrap';

type Messages = { title: string; unpreparedTitle: string; prepare: string; unpreparedReasons: string; retry: string; signIn: string };

/** Any logo an earlier signed-in visit stored for the shell; logos are public, never account data. */
async function storedLogo(): Promise<string | null> {
  if (typeof caches === 'undefined') return null;
  const cache = await caches.open(SHELL_BRANDING.cacheName);
  const [first] = await cache.keys();
  const response = first && await cache.match(first);
  return response ? URL.createObjectURL(await response.blob()) : null;
}

/**
 * The shell opened without an account it may show: never prepared on this
 * browser, signed out, expired or refused. It says why and how to fix it.
 */
export function UnpreparedDevice({ messages }: { messages: Messages }) {
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    void storedLogo().then(value => { url = value; if (!cancelled) setLogo(value); }).catch(() => undefined);
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, []);
  return <main data-school-offline-unprepared className="grid min-h-dvh place-items-center bg-muted/40 p-4 text-foreground">
    <section className="w-full max-w-md rounded-2xl border border-muted-foreground/20 bg-card p-8 text-center shadow-sm">
      {logo
        // eslint-disable-next-line @next/next/no-img-element -- a stored blob, no Next image optimizer offline
        ? <img src={logo} alt={messages.title} className="mx-auto h-16 w-16 object-contain" />
        : <p className="text-lg font-semibold">{messages.title}</p>}
      <div className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WifiOff className="h-6 w-6" aria-hidden />
      </div>
      <h1 className="mt-4 text-xl font-semibold">{messages.unpreparedTitle}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{messages.prepare}</p>
      <p className="mt-3 text-xs text-muted-foreground">{messages.unpreparedReasons}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" onClick={() => location.reload()}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <RefreshCw className="h-4 w-4" aria-hidden />{messages.retry}
        </button>
        <a href="/login" className="inline-flex items-center justify-center rounded-md border border-muted-foreground/30 px-4 py-2 text-sm font-medium">{messages.signIn}</a>
      </div>
    </section>
  </main>;
}
