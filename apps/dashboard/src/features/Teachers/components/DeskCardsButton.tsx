'use client';

import { NButton } from 'najm-kit';
import { IdCard } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { schoolApp } from '@/najm.config';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useSchoolPrintOptions } from '@/hooks/useSchoolPrintOptions';
import { printSchoolDocument } from '@/shared/schoolPrintDocument';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { buildTeacherDeskCards, type DeskCardClass, type DeskCardSubject, type DeskCardTeacher } from '../config/teacherDeskCards';

/** Prints a half-A4 desk card for each teacher given: the selected ones, else those the table shows. */
export function DeskCardsButton({ teachers, classes, subjects, disabled }: {
  teachers: readonly DeskCardTeacher[];
  classes: readonly DeskCardClass[];
  subjects: readonly DeskCardSubject[];
  disabled?: boolean;
}) {
  const { t, language } = useTranslation();
  const { publicSettings } = usePublicSettings();
  const printOptions = useSchoolPrintOptions();
  const { viewingYear } = useViewingAcademicYear();
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;
  const label = t('teachers.deskCards.button');

  const print = () => {
    if (!teachers.length) {
      toast.error(t('teachers.deskCards.none'));
      return;
    }
    const { school, assetOrigin, accent } = printOptions({ title: '', date: '', details: [], columns: [] });
    const sorted = [...teachers].sort((a, b) => a.name.localeCompare(b.name, language));
    return printSchoolDocument(buildTeacherDeskCards(sorted, {
      subjects,
      classes,
      school: { name: settings?.schoolName || schoolApp.appName, nameAr: settings?.schoolNameAr, logo: school.logo },
      year: viewingYear ?? '',
      fallback: language === 'ar' ? 'ar' : 'fr',
      assetOrigin,
      accent,
    }));
  };

  return (
    <NButton
      type="button"
      variant="outline"
      className="hidden h-10 md:inline-flex"
      aria-label={t('teachers.deskCards.hint')}
      title={t('teachers.deskCards.hint')}
      disabled={disabled}
      onClick={print}
      leftIcon={<IdCard className="h-4 w-4" />}
    >
      {label}
    </NButton>
  );
}
