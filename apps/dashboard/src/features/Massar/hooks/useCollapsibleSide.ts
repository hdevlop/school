'use client';
import { useEffect, useRef, useState, type PointerEvent, type MouseEvent } from 'react';

const STORAGE_KEY = 'massar-side-collapsed';
/** Matches the width transition in Massar.module.css (.2s). */
const WIDTH_TRANSITION_MS = 200;
/** How far the rail must be dragged before it collapses or expands the column. */
const DRAG_THRESHOLD_PX = 24;

/**
 * The classes column beside a wide grid can be narrowed; the choice is kept for the next visit.
 *
 * Two steps so nothing jumps: the width (`collapsed`) and the compact contents (`compact`).
 * Collapsing shows the compact contents first, then narrows; opening widens first and shows the
 * full contents only once there is room, so the long label never wraps mid-animation.
 *
 * `railProps` go on the handle on the column's border: a click toggles it; dragging it toward the
 * column narrows it the moment the drag goes far enough, and away widens it.
 */
export function useCollapsibleSide() {
  const [collapsed, setCollapsed] = useState(false);
  const [compact, setCompact] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const drag = useRef<{ x: number; dragged: boolean } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) === '1';
      setCollapsed(stored);
      setCompact(stored);
    } catch { /* Storage can be unavailable in private browsing. */ }
    return () => clearTimeout(timer.current);
  }, []);

  const setSide = (next: boolean) => {
    clearTimeout(timer.current);
    setCollapsed(next);
    if (next) setCompact(true);
    else timer.current = setTimeout(() => setCompact(false), WIDTH_TRANSITION_MS);
    try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* The column still toggles for this visit. */ }
  };

  const railProps = {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      drag.current = { x: event.clientX, dragged: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const current = drag.current;
      if (!current) return;
      const moved = event.clientX - current.x;
      if (Math.abs(moved) < DRAG_THRESHOLD_PX) return;
      const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
      const collapse = rtl ? moved > 0 : moved < 0;
      current.dragged = true;
      current.x = event.clientX;
      if (collapse !== collapsed) setSide(collapse);
    },
    onPointerUp: () => {
      const current = drag.current;
      drag.current = null;
      if (current && !current.dragged) setSide(!collapsed);
    },
    onPointerCancel: () => { drag.current = null; },
    // A keyboard press (no pointer, detail 0) toggles too.
    onClick: (event: MouseEvent<HTMLButtonElement>) => { if (event.detail === 0) setSide(!collapsed); },
  };

  return { collapsed, compact, railProps };
}
