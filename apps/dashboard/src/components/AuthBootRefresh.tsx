'use client';

import { useRef } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { authBootRefreshScript } from '@/najm.auth';

/** Starts auth from the initial server HTML, never from a client navigation. */
export function AuthBootRefresh({ nonce }: { nonce?: string }) {
  const inserted = useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script id="school-auth-boot-refresh" nonce={nonce} dangerouslySetInnerHTML={{ __html: authBootRefreshScript }} />;
  });

  return null;
}
