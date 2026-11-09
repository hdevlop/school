"use client";

import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

// Shown in place of an assignment for a school-wide job title with none: it reads every class.
export function WholeSchoolTag() {
  const { t } = useTranslation();
  return (
    <NBadge className="w-fit shrink-0 rounded-full bg-primary/10 font-medium text-primary ring-1 ring-inset ring-primary/20">
      {t('staff.table.wholeSchool')}
    </NBadge>
  );
}
