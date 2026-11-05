'use client';

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from 'najm-kit';

type ActionSlot = { id: string; element: HTMLDivElement };
type FeatureActions = {
  slots: ActionSlot[];
  register: (slot: ActionSlot) => () => void;
};

const FeatureActionsContext = createContext<FeatureActions | null>(null);

/** A route owns the menu's destinations; each feature keeps its own commands and state. */
export function FeatureActionsProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [slots, setSlots] = useState<ActionSlot[]>([]);
  const register = useCallback((slot: ActionSlot) => {
    setSlots(current => [...current.filter(item => item.id !== slot.id), slot]);
    return () => setSlots(current => current.filter(item => item.id !== slot.id));
  }, []);
  return <FeatureActionsContext.Provider value={enabled ? { slots, register } : null}>{children}</FeatureActionsContext.Provider>;
}

export function useFeatureActions() {
  return useContext(FeatureActionsContext);
}

/** Modal content owns its controls instead of registering them behind the modal. */
export function InlineFeatureActions({ children }: { children: ReactNode }) {
  return <FeatureActionsContext.Provider value={null}>{children}</FeatureActionsContext.Provider>;
}

/**
 * A stable portal moves the existing controls, including their open dialogs,
 * between the desktop toolbar and the phone menu without copying their state.
 */
export function MobileFeatureActions({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const context = useFeatureActions();
  const register = context?.register;
  const id = useId();
  const isPhone = useMediaQuery('(max-width: 767px)');
  const inlineHost = useRef<HTMLSpanElement | null>(null);
  const container = useRef<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [inDialog, setInDialog] = useState(false);
  const canMove = !!register && enabled && !inDialog;

  const attach = useCallback((host: HTMLSpanElement | null) => {
    inlineHost.current = host;
    if (!host || container.current) return;
    // A dialog keeps its own actions beside its fields, within that dialog.
    setInDialog(!!host.closest('[role="dialog"]'));
    const element = document.createElement('div');
    element.dataset.featureActionGroup = '';
    element.className = 'contents';
    container.current = element;
    host.appendChild(element);
    setTarget(element);
  }, []);

  useLayoutEffect(() => {
    if (target && (!canMove || !isPhone)) inlineHost.current?.appendChild(target);
  }, [target, canMove, isPhone]);

  useEffect(() => {
    if (register && canMove && isPhone && target) return register({ id, element: target });
  }, [register, canMove, isPhone, target, id]);

  return <>
    <span ref={attach} className={canMove ? 'hidden md:contents' : 'contents'}>{!target && children}</span>
    {target && createPortal(children, target)}
  </>;
}

function FeatureActionSlot({ slot }: { slot: ActionSlot }) {
  const attach = useCallback((host: HTMLDivElement | null) => {
    if (host) host.appendChild(slot.element);
  }, [slot.element]);
  return <div ref={attach} data-feature-menu-slot />;
}

export function FeatureActionSlots() {
  const context = useFeatureActions();
  return context?.slots.map(slot => <FeatureActionSlot key={slot.id} slot={slot} />);
}
