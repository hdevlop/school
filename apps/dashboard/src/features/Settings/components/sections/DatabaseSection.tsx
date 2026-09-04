'use client'

import { Input, Label, NButton, NCard, NumberInput, useDialog } from 'najm-kit';

import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Database, Eye, EyeOff, GraduationCap, Key, Loader2, Trash2, Upload, Users } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { type SeedDemoOptions } from '@/services/seedApi';
import { useSeedDemo, useSeedSystem, useClearAllData } from '../../hooks/useSettings';

interface SeedOptionsContentProps {
  maxStudents?: number;
  maxTeachers?: number;
  onOptionsChange: (opts: SeedDemoOptions) => void;
}

const clampSeedCount = (value: number, max: number) => {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(1, value), max);
};

const SeedOptionsContent: React.FC<SeedOptionsContentProps> = ({
  maxStudents = 180,
  maxTeachers = 40,
  onOptionsChange,
}) => {
  const { t } = useTranslation();
  const [students, setStudents] = useState(maxStudents);
  const [teachers, setTeachers] = useState(maxTeachers);

  const updateStudents = (value: number) => {
    const nextStudents = clampSeedCount(value, maxStudents);
    setStudents(nextStudents);
    onOptionsChange({ students: nextStudents, teachers });
  };

  const updateTeachers = (value: number) => {
    const nextTeachers = clampSeedCount(value, maxTeachers);
    setTeachers(nextTeachers);
    onOptionsChange({ students, teachers: nextTeachers });
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex items-center justify-center w-14 h-14 rounded-full">
        <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>

      <div className="text-center space-y-3 w-full">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">{t('settings.seed.confirmTitle')}</h3>
        </div>

        <p className="text-muted-foreground mb-3">
          {t('settings.seed.confirmDescription')}
        </p>

        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              Students
              <span className="text-muted-foreground font-normal">/ {maxStudents}</span>
            </Label>
            <NumberInput
              value={students}
              onChange={updateStudents}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              Teachers
              <span className="text-muted-foreground font-normal">/ {maxTeachers}</span>
            </Label>
            <NumberInput
              value={teachers}
              onChange={updateTeachers}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-left">
          <p className="text-sm font-medium text-destructive mb-2">
            {t('settings.seed.warningTitle')}
          </p>
          <ul className="text-sm text-destructive space-y-1">
            <li>• {t('settings.seed.warningPoint1')}</li>
            <li>• {t('settings.seed.warningPoint2')}</li>
            <li>• {t('settings.seed.warningPoint3')}</li>
          </ul>
        </div>

        <p className="text-sm text-muted-foreground font-medium">
          {t('common.confirmAction')}
        </p>
      </div>
    </div>
  );
};

// ─── Seed Loading Overlay ─────────────────────────────────────────────────────

interface SeedOverlayProps {
  visible: boolean;
  label: string;
}

const STEPS = [
  'Clearing existing data',
  'Initializing roles & settings',
  'Creating subjects & classes',
  'Adding sections & fee types',
  'Creating parents & teachers',
  'Enrolling students',
  'Processing fees',
  'Finalizing',
];

const CIRCUMFERENCE = 2 * Math.PI * 26;

const SeedOverlay: React.FC<SeedOverlayProps> = ({ visible, label }) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!visible) { setStepIndex(0); return; }
    const t = setInterval(() => {
      setStepIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 7000);
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;

  const pct = Math.round(((stepIndex + 1) / STEPS.length) * 100);
  const offset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="relative flex flex-col items-center bg-card border border-border/60 rounded-3xl shadow-2xl w-[380px] mx-4 overflow-hidden">

        <div className="w-full h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        <div className="flex flex-col items-center gap-5 px-8 pt-7 pb-6 w-full">

          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="26" fill="none" strokeWidth="4" stroke="#e2e8f0" />
              <circle cx="30" cy="30" r="26" fill="none" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
                style={{ stroke: 'color-mix(in oklab, var(--primary) 25%, transparent)', filter: 'blur(3px)', transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)' }}
              />
              <circle cx="30" cy="30" r="26" fill="none" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
                style={{ stroke: 'var(--primary)', transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-bold text-foreground leading-none">{pct}%</span>
            </div>
          </div>

          <div className="text-center space-y-0.5">
            <p className="text-base font-bold text-foreground tracking-tight">{label}</p>
            <p className="text-xs text-muted-foreground">Step {stepIndex + 1} of {STEPS.length}</p>
          </div>

          <div className="w-full space-y-0.5">
            {STEPS.map((step, i) => {
              const done    = i < stepIndex;
              const active  = i === stepIndex;
              const pending = i > stepIndex;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-500
                    ${active  ? 'bg-primary/8 border-primary/20' : 'border-transparent'}
                    ${pending ? 'opacity-35' : 'opacity-100'}
                  `}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all duration-500
                    ${done   ? 'bg-primary text-primary-foreground'
                    : active ? 'border-2 border-primary text-primary'
                    :          'border border-muted-foreground/25 text-muted-foreground/50'}`}
                  >
                    {done ? (
                      <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                      </svg>
                    ) : (
                      <span className={active ? 'animate-pulse' : ''}>{i + 1}</span>
                    )}
                  </div>

                  <span className={`text-xs leading-none transition-all duration-300
                    ${done   ? 'text-muted-foreground line-through decoration-muted-foreground/40'
                    : active ? 'text-foreground font-semibold'
                    :          'text-muted-foreground'}`}
                  >
                    {step}
                  </span>

                  {active && (
                    <svg className="ml-auto w-3 h-3 text-primary animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31" strokeDashoffset="10" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 border-t border-border/60 pt-3 w-full justify-center">
            <svg className="w-3 h-3 text-amber-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
            </svg>
            Do not close or refresh this page
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Section ─────────────────────────────────────────────────────────────

const DatabaseSection: React.FC = () => {
  const { t } = useTranslation();
  const { openDialog } = useDialog();
  const seedDemo = useSeedDemo();
  const seedSystem = useSeedSystem();
  const clearAllData = useClearAllData();
  const [showApiKey, setShowApiKey] = useState(false);
  const seedOptionsRef = useRef<SeedDemoOptions>({ students: 180, teachers: 40 });
  const apiKey = process.env.NEXT_PUBLIC_SEED_API_KEY || 'sk-************************';

  const isSeeding = seedDemo.isLoading || seedSystem.isLoading;

  const handleSeedDemoClick = () => {
    seedOptionsRef.current = { students: 180, teachers: 40 };
    openDialog({
      title: t('settings.seed.confirmTitle'),
      description: t('settings.seed.confirmDescription'),
      children: (
        <SeedOptionsContent
          maxStudents={180}
          maxTeachers={40}
          onOptionsChange={(opts) => { seedOptionsRef.current = opts; }}
        />
      ),
      primaryButton: {
        text: t('settings.seed.confirm'),
        variant: 'destructive',
        loading: seedDemo.isLoading,
        onClick: async () => {
          await seedDemo.mutateAsync(seedOptionsRef.current);
        }
      },
      secondaryButton: {
        text: t('common.cancel'),
        variant: 'outline',
      }
    });
  };

  const handleSeedSystemClick = () => {
    openDialog({
      title: t('settings.system.confirmTitle'),
      description: t('settings.system.confirmDescription'),
      children: (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-200">
            <Database className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">{t('settings.system.confirmTitle')}</h3>
            <p className="text-muted-foreground mb-2">
              {t('settings.system.confirmDescription')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('common.confirmAction')}
            </p>
          </div>
        </div>
      ),
      primaryButton: {
        text: t('settings.system.confirm'),
        variant: 'default',
        loading: seedSystem.isLoading,
        onClick: async () => {
          await seedSystem.mutateAsync();
        }
      },
      secondaryButton: {
        text: t('common.cancel'),
        variant: 'outline',
      }
    });
  };

  const handleClearDataClick = () => {
    openDialog({
      title: t('settings.clear.confirmTitle'),
      description: t('settings.clear.confirmDescription'),
      children: (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-200">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">{t('settings.clear.confirmTitle')}</h3>
            <p className="text-muted-foreground mb-2">
              {t('settings.clear.confirmDescription')}
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-left">
              <p className="text-sm font-medium text-destructive mb-1">
                ⚠️ {t('common.warning')}
              </p>
              <p className="text-sm text-destructive/80">
                {t('settings.clear.warningMessage')}
              </p>
            </div>
          </div>
        </div>
      ),
      primaryButton: {
        text: t('settings.clear.confirm'),
        variant: 'destructive',
        loading: clearAllData.isLoading,
        onClick: async () => {
          await clearAllData.mutateAsync();
        }
      },
      secondaryButton: {
        text: t('common.cancel'),
        variant: 'outline',
      }
    });
  };

  return (
    <>
      <SeedOverlay
        visible={isSeeding}
        label={seedDemo.isLoading ? 'Seeding demo data…' : 'Initializing system…'}
      />

      <NCard
        title={t('settings.database.title') || 'Database & API'}
        icon={Database}
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('settings.database.description') || 'Manage database operations and API credentials'}
            </p>

            <div className="space-y-3">
              <NButton
                variant="destructive"
                className="w-full"
                disabled={seedDemo.isLoading || isSeeding}
                onClick={handleSeedDemoClick}
              >
                {seedDemo.isLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Seeding…</>
                  : <><Database className="h-4 w-4 mr-2" />{t('settings.seed.button') || 'Seed Demo Data'}</>
                }
              </NButton>

              <NButton
                variant="outline"
                className="w-full"
                disabled={seedSystem.isLoading || isSeeding}
                onClick={handleSeedSystemClick}
              >
                {seedSystem.isLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Initializing…</>
                  : <><Upload className="h-4 w-4 mr-2" />{t('settings.system.button') || 'Seed System Defaults'}</>
                }
              </NButton>

              <NButton
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                disabled={clearAllData.isLoading || isSeeding}
                onClick={handleClearDataClick}
              >
                {clearAllData.isLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Clearing…</>
                  : <><Trash2 className="h-4 w-4 mr-2" />{t('settings.clear.button') || 'Clear All Data'}</>
                }
              </NButton>
            </div>
          </div>

          <hr />

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4" />
              {t('settings.security.apiKey') || 'API Key'}
            </Label>
            <div className="flex gap-2">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                readOnly
                className="font-mono text-sm"
              />
              <NButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </NButton>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settings.security.apiKeyDescription') || 'Your API key for external integrations'}
            </p>
          </div>
        </div>
      </NCard>
    </>
  );
};

export default DatabaseSection;
