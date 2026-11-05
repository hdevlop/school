'use client';

import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { BotMessageSquare } from 'lucide-react';
import type { ChatbotProps } from 'najm-chatbot/react';
import { useAuth } from 'najm-auth/client/react';
import { ACADEMIC_YEAR_QUERY } from '@sms/contracts/academic-years';
import { useAcademicYearScope } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { useTranslation } from 'najm-i18n/react';
import { chatbotTranslator } from '../config/chatbotLabels';

// The widget checks its status as soon as it mounts, open or not: the AI
// settings, then the MCP tool list. On every app start that was its code plus
// two requests after the page's own, about a second on JHL phones. School now
// shows a stand-in button and loads the widget on the first tap or Ctrl+K.
const loadChatbot = () => import('najm-chatbot/react');
const Chatbot = lazy(() => loadChatbot().then((module) => ({ default: module.Chatbot })));

type YearScopedChatbotProps = Omit<ChatbotProps, 'apiPath' | 'sessionKey' | 'initialOpen'>;

/** The published widget accepts an API URL; School promotes its year to a header. */
export function YearScopedChatbot(props: YearScopedChatbotProps) {
  const { accountScope, academicYear, ready } = useAcademicYearScope();
  const { accessToken } = useAuth();
  const { t } = useTranslation();
  const i18n = useMemo(() => chatbotTranslator(t), [t]);
  const chatKey = JSON.stringify([accountScope, academicYear]);
  const [started, setStarted] = useState(false);
  // The tap that loads the widget also opens it. Any later remount (another
  // year) starts closed, as the widget always did.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const start = () => {
    setStarted(true);
    setOpenKey(chatKey);
  };

  useEffect(() => {
    if (openKey !== null && openKey !== chatKey) setOpenKey(null);
  }, [openKey, chatKey]);

  // The widget's own shortcut, until the widget is there to handle it.
  useEffect(() => {
    if (started) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setStarted(true);
        setOpenKey(chatKey);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [started, chatKey]);

  if (!ready || !accessToken) return null;

  const launcher = (
    <ChatbotLauncher
      className={props.className}
      primary={props.theme?.primary}
      label={i18n('AI Assistant')}
      onStart={start}
    />
  );
  if (!started) return launcher;

  return (
    <Suspense fallback={launcher}>
      <Chatbot
        i18n={i18n}
        {...props}
        initialOpen={openKey === chatKey}
        key={chatKey}
        apiPath={`/api/chat?${ACADEMIC_YEAR_QUERY}=${encodeURIComponent(academicYear!)}`}
      />
    </Suspense>
  );
}

/**
 * The widget's own closed button, without its status dot (the status is what
 * is no longer fetched). Same wrapper and button, so page styles that move
 * `.school-chatbot > button` apply to both.
 */
function ChatbotLauncher({ className, primary, label, onStart }: {
  className?: string;
  primary?: string;
  label: string;
  onStart: () => void;
}) {
  // Hovering, focusing or touching the button starts the download.
  const warm = () => { void loadChatbot(); };
  return (
    <div className={className} style={{ '--ncb-primary': primary ?? '#2563eb' } as CSSProperties}>
      <button
        type="button"
        onClick={onStart}
        onPointerEnter={warm}
        onFocus={warm}
        onTouchStart={warm}
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ncb-primary)] text-white shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--ncb-primary)] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
        title={label}
        aria-label={label}
        aria-expanded={false}
      >
        <BotMessageSquare className="h-6 w-6" />
      </button>
    </div>
  );
}
