'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * A chart's ResponsiveContainer, drawn only once its box comes near the
 * screen, then kept. On a phone the dashboard is one long column: drawing all
 * five charts as their data arrived blocked the page for 2.1 s on a JHL phone
 * profile, while only the first was in view. The box keeps its size, so the
 * page does not move when a chart appears. Without IntersectionObserver the
 * chart is drawn at once.
 */
export function DeferredChart({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = box.current;
    if (!element || near) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setNear(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);

  return (
    <div ref={box} className="size-full">
      {near && (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
}
