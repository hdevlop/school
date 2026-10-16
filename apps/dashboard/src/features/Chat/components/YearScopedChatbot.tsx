'use client';

import { useMemo, type ComponentProps } from 'react';
import { Chatbot } from 'najm-chatbot/react';
import { useAuth } from 'najm-auth/client/react';
import { ACADEMIC_YEAR_QUERY } from '@sms/contracts/academic-years';
import { useAcademicYearScope } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { useTranslation } from 'najm-i18n/react';
import { chatbotTranslator } from '../config/chatbotLabels';

/** The published widget accepts an API URL; School promotes its year to a header. */
export function YearScopedChatbot(props: Omit<ComponentProps<typeof Chatbot>, 'apiPath' | 'sessionKey'>) {
  const { accountScope, academicYear, ready } = useAcademicYearScope();
  const { accessToken } = useAuth();
  const { t } = useTranslation();
  const i18n = useMemo(() => chatbotTranslator(t), [t]);
  if (!ready || !accessToken) return null;

  return (
    <Chatbot
      i18n={i18n}
      {...props}
      key={JSON.stringify([accountScope, academicYear])}
      apiPath={`/api/chat?${ACADEMIC_YEAR_QUERY}=${encodeURIComponent(academicYear!)}`}
    />
  );
}
