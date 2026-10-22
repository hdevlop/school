import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useSubjectsTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'name',
      placeholder: t('academic.subjectSearch'),
      type: 'text',
    }
  ], [t]);
};
