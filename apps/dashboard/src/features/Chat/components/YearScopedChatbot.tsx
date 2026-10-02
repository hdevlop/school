'use client';

import type { ComponentProps } from 'react';
import { Chatbot } from 'najm-chatbot/react';
import { ACADEMIC_YEAR_QUERY } from '@sms/contracts/academic-years';
import { useAcademicYearScope } from '@/features/AcademicYears/hooks/useYearScopedQuery';

/** The published widget accepts an API URL; School promotes its year to a header. */
export function YearScopedChatbot(props: Omit<ComponentProps<typeof Chatbot>, 'apiPath' | 'sessionKey'>) {
  const { accountScope, academicYear, ready } = useAcademicYearScope();
  if (!ready) return null;

  return (
    <Chatbot
      {...props}
      key={JSON.stringify([accountScope, academicYear])}
      apiPath={`/api/chat?${ACADEMIC_YEAR_QUERY}=${encodeURIComponent(academicYear!)}`}
    />
  );
}
