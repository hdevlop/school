'use client';

import { useState } from 'react';
import { Printer } from 'lucide-react';
import { NajmScroll, NButton, NEmptyState, NErrorState, NForbiddenState, NLoadingState, NPageHeader, NPageHeaderActions } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { toast } from 'sonner';
import { toAppClassName, toOfficialClassName } from '@sms/contracts';
import { schoolApp } from '@/najm.config';
import { useViewingAcademicYear, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { PlanningPreview } from '@/features/Assessments/planning/PlanningPreview';
import { printPlanningDocument } from '@/features/Assessments/planning/planningDocument';
import { CLASS_DOCUMENT_COLORS } from '@/features/Assessments/planning/planningModel';
import { useCycles } from '@/features/Cycles/hooks/useCycles';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useStudents } from '@/features/Students/hooks/useStudents';
import { isAuthorizationError } from '@/services/apiError';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { buildInsuranceDocument, insuranceClasses, type InsuranceDocumentOptions } from './insuranceDocument';
import styles from './InsuranceRegister.module.css';

// Primary levels keep the planning documents' colors; the other levels get their own.
const LEVEL_COLORS: Record<string, string> = {
  PS: '#C9A227', MS: '#A0522D', GS: '#6B8E23', '1AC': '#1E3A8A', '2AC': '#B91C1C', '3AC': '#475569',
};
const levelColor = (name: string) => {
  const grade = /^([1-6])APG$/i.exec(toOfficialClassName(name));
  return grade ? CLASS_DOCUMENT_COLORS[Number(grade[1]) - 1][0] : LEVEL_COLORS[toAppClassName(name).toUpperCase()] ?? 'var(--muted-foreground)';
};

type Cycle = { name: string; labels?: Record<string, string> | null; sortOrder?: number | null };

function InsuranceContent() {
  const { t } = useTranslation();
  const { viewingYear } = useViewingAcademicYear();
  const { students, isStudentsLoading, error } = useStudents();
  // The licensed cycles are a header detail: a role that cannot read cycles still prints the list.
  const { cycles } = useCycles({ activeOnly: true });
  const { publicSettings, isSettingsLoading, error: settingsError } = usePublicSettings();
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;
  const logo = useNThemeBrandingSlot('authLogo');
  const [pickedClass, setClass] = useState('');
  const [isPrinting, setPrinting] = useState(false);
  const classes = insuranceClasses(Array.isArray(students) ? students : []);
  const classId = classes.some(cls => cls.id === pickedClass) ? pickedClass : '';
  const shownClasses = classes.filter(cls => !classId || cls.id === classId);
  const cycleNames = [...(Array.isArray(cycles) ? cycles as Cycle[] : [])]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(cycle => cycle.labels?.ar?.trim() || cycle.name);
  const options: InsuranceDocumentOptions = {
    // The official Arabic identity from Settings, else the everyday one.
    schoolName: settings?.schoolNameAr || settings?.schoolName || schoolApp.appName,
    schoolLogo: settings?.schoolLogo || logo,
    schoolAddress: settings?.schoolAddressAr || settings?.schoolAddress,
    schoolPhones: settings?.schoolPhones?.length ? settings.schoolPhones : settings?.schoolPhone ? [settings.schoolPhone] : [],
    licenseNumber: settings?.schoolLicenseNumber,
    licenseDate: settings?.schoolLicenseDate,
    cycles: cycleNames,
    academicYear: viewingYear ?? '',
    assetOrigin: typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
  };
  const loading = isStudentsLoading || isSettingsLoading;
  const printDisabled = !shownClasses.length || loading || !!error || !!settingsError || isPrinting;
  const print = async () => {
    setPrinting(true);
    try { if (!await printPlanningDocument(buildInsuranceDocument(shownClasses, options))) toast.error(t('insurance.popupBlocked')); }
    catch { toast.error(t('insurance.printFailed')); }
    finally { setPrinting(false); }
  };

  return <div className={styles.page}>
    <NPageHeader icon={FEATURE_ICONS.insurance} title={t('insurance.title')} subtitle={t('insurance.subtitle')}>
      <NPageHeaderActions>
        <PageHeaderGlobalActions />
      </NPageHeaderActions>
    </NPageHeader>
    <NajmScroll axis="y" autoHide="scroll" className={styles.scrollArea}>
      <main className={styles.main}>
        {error ? isAuthorizationError(error) ? <NForbiddenState surface="panel" /> : <NErrorState surface="panel" />
          : settingsError ? <NErrorState surface="panel" />
          : loading ? <NLoadingState surface="panel" label={t('common.loading')} />
          : !classes.length ? <NEmptyState surface="panel" icon={FEATURE_ICONS.insurance} title={t('insurance.emptyTitle')} description={t('insurance.emptyDescription')} />
          : <>
            <div className={styles.toolbar}>
              <div className={styles.classRow} role="group" aria-label={t('insurance.classes')}>
                <button className={styles.classButton} type="button" aria-pressed={!classId} onClick={() => setClass('')}>{t('insurance.allClasses')}</button>
                {classes.map(cls => <button className={styles.classButton} key={cls.id} type="button" title={cls.name} aria-pressed={classId === cls.id} onClick={() => setClass(cls.id)}>
                  <span className={styles.dot} style={{ background: levelColor(cls.name) }} aria-hidden="true" />
                  {toOfficialClassName(cls.name)}
                </button>)}
              </div>
              <NButton variant="default" className={styles.printButton} disabled={printDisabled} loading={isPrinting} onClick={print} leftIcon={<Printer className="size-4" />}>{t('insurance.print')}</NButton>
            </div>
            <div className={styles.paperStage}><PlanningPreview html={buildInsuranceDocument(shownClasses, options)} title={t('insurance.preview')} /></div>
          </>}
      </main>
    </NajmScroll>
  </div>;
}

export default function InsuranceRegisterPage() {
  const yearKey = useViewingYearKey();
  return <InsuranceContent key={yearKey} />;
}
