'use client'

import React from 'react';
import { Shield, Key, AlertTriangle, Users, GraduationCap, Contact } from 'lucide-react';
import { FormInput } from 'najm-kit';

import { useTranslation } from '@/hooks/useLanguage';
import { Label } from 'najm-kit';

const SecuritySection: React.FC = () => {
  
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 font-semibold text-sm">
        <Shield className="h-4 w-4" />
        <Label className='text-lg'> {t('settings.security.title')} </Label>
      </div>

      <div className="flex flex-col gap-3">
        <FormInput
          type="switch"
          name="twoFactorEnabled"
          label={t('settings.security.twoFactorAuth')}
          icon={Key}
          iconColor="#3b82f6"
          variant="ghost"
        />

<FormInput
          type="switch"
          name="passwordRequireSymbols"
          label={t('settings.security.passwordExpiry')}
          icon={AlertTriangle}
          iconColor="#ef4444"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="loginNotifications"
          label={t('settings.security.loginNotifications')}
          icon={Shield}
          iconColor="#10b981"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="parentAccessEnabled"
          label={t('settings.security.parentAccessEnabled')}
          icon={Users}
          iconColor="#a855f7"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="teacherAccessEnabled"
          label={t('settings.security.teacherAccessEnabled')}
          icon={Contact}
          iconColor="#06b6d4"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="studentAccessEnabled"
          label={t('settings.security.studentAccessEnabled')}
          icon={GraduationCap}
          iconColor="#ec4899"
          variant="ghost"
        />
      </div>
    </div>
  );
};

export default SecuritySection;