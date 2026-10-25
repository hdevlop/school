'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { usePathname, useRouter, useSearchParams } from 'najm-offline/shell/navigation';

function NavigationProof() {
  const [tick, setTick] = useState(0);
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const previous = useRef<{ search: typeof search; router: typeof router } | null>(null);
  useEffect(() => {
    const data = document.documentElement.dataset;
    data.searchSame = String(previous.current?.search === search);
    data.routerSame = String(previous.current?.router === router);
    data.query = search.get('q') ?? '';
    data.pathname = pathname;
    data.tick = String(tick);
    previous.current = { search, router };
  }, [search, router, pathname, tick]);
  return <>
    <button onClick={() => setTick(value => value + 1)}>Rerender</button>
    <button onClick={() => router.push('/navigation-proof?q=one')}>Change query</button>
    <button onClick={() => router.push('/navigation-proof/other?q=one')}>Change path</button>
  </>;
}
createRoot(document.getElementById('root')!).render(<NavigationProof />);
