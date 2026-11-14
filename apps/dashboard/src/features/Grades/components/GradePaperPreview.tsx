'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetTitle } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

/** A4 landscape at 96 dpi (297 mm): the paper is laid out at this width, then scaled to the screen. */
const PAPER_WIDTH = 1123;

/**
 * On screen the paper has nothing around it: no grey desk, no shadow, a thin
 * margin. Every pixel goes to the marks; the printed paper keeps its own.
 */
const SCREEN_ONLY_CSS = '<style>body{padding:0!important;background:#fff!important}.sheet{margin:0!important;padding:3mm!important;max-width:none!important;box-shadow:none!important}</style>';

/**
 * A Massar sheet as its paper, every part side by side, to check on a phone.
 * Nothing in it can be edited, and nothing else is on screen: no title bar, no
 * padding, only the page across the full width and a round close button over
 * it. Turning the phone sideways shows it larger; pinch-zoom brings a cell closer.
 */
export default function GradePaperPreview({ html, title, onClose }: {
  /** The paper's document; null when closed. */
  html: string | null;
  /** Read by screen readers only: the sheet's subject and Contrôle. */
  title: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState(794);
  const paper = useMemo(() => html?.replace('</head>', `${SCREEN_ONLY_CSS}</head>`) ?? null, [html]);

  // Fit the page to the screen's width, again when the phone turns.
  useEffect(() => {
    const element = box.current;
    if (!paper || !element) return;
    const fit = () => setScale(element.clientWidth / PAPER_WIDTH);
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    fit();
    return () => observer.disconnect();
  }, [paper]);

  // The paper's own height, once its fonts and logo have laid it out.
  useEffect(() => {
    const element = frame.current;
    if (!paper || !element) return;
    let observer: ResizeObserver | undefined;
    const measure = () => {
      const page = element.contentDocument?.documentElement;
      if (page) setHeight(Math.ceil(page.scrollHeight));
    };
    const observe = () => {
      observer?.disconnect();
      const body = element.contentDocument?.body;
      if (!body) return;
      observer = new ResizeObserver(measure);
      observer.observe(body);
      measure();
    };
    element.addEventListener('load', observe);
    if (element.contentDocument?.readyState === 'complete') observe();
    return () => { observer?.disconnect(); element.removeEventListener('load', observe); };
  }, [paper]);

  return (
    <Sheet open={!!paper} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className={[
          'inset-0 h-dvh max-h-dvh w-screen max-w-none gap-0 overflow-y-auto overscroll-contain rounded-none border-0 bg-white p-0',
          // The sheet's own close button, kept and made a round button that reads over the paper.
          '[&>button:last-child]:fixed [&>button:last-child]:top-2 [&>button:last-child]:end-2 [&>button:last-child]:z-10',
          '[&>button:last-child]:rounded-full [&>button:last-child]:bg-black/60 [&>button:last-child]:p-2.5 [&>button:last-child]:text-white [&>button:last-child]:opacity-100 [&>button:last-child]:shadow-md',
        ].join(' ')}
      >
        <SheetTitle className="sr-only">{`${t('grades.paperPreview')} · ${title}`}</SheetTitle>
        {/* Laid out left to right whatever the interface: the scaled page is anchored at its top left. */}
        <div ref={box} dir="ltr" className="w-full overflow-hidden">
          {paper ? (
            <div style={{ height: height * scale }}>
              <iframe
                ref={frame}
                title={t('grades.paperPreview')}
                srcDoc={paper}
                // No scripts: the paper is a document to read, and nothing in it is editable.
                sandbox="allow-same-origin"
                className="block border-0 bg-white"
                style={{ width: PAPER_WIDTH, height, transform: `scale(${scale})`, transformOrigin: 'top left', visibility: scale ? 'visible' : 'hidden' }}
              />
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
