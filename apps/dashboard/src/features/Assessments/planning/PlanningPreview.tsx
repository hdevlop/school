'use client';

import { useEffect, useRef, useState } from 'react';

export function PlanningPreview({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1100);
  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let observer: ResizeObserver | undefined;
    let cancelled = false;
    const observe = () => {
      observer?.disconnect();
      const body = frame.contentDocument?.body;
      if (!body) return;
      const measure = () => { if (!cancelled) setHeight(Math.ceil(body.getBoundingClientRect().height)); };
      observer = new ResizeObserver(measure);
      observer.observe(body);
      measure();
    };
    frame.addEventListener('load', observe);
    if (frame.contentDocument?.readyState === 'complete') observe();
    return () => { cancelled = true; observer?.disconnect(); frame.removeEventListener('load', observe); };
  }, [html]);
  return <iframe ref={ref} title={title} srcDoc={html} sandbox="allow-same-origin" className="block w-full rounded-lg border bg-white" style={{ height }} />;
}
