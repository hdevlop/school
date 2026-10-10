'use client'

import React from 'react';
import { Key, AlertTriangle, Users, GraduationCap, Contact, BellRing } from 'lucide-react';
import { FormInput } from 'najm-kit';

import { useTranslation } from 'najm-i18n/react';
import { SettingsGroup } from '../SettingsGroup';

const signIn = [
  { name: 'twoFactorEnabled', label: 'settings.security.twoFactorAuth', icon: Key },
  { name: 'passwordRequireSymbols', label: 'settings.editor.passwordRequireSymbols', icon: AlertTriangle },
  { name: 'loginNotifications', label: 'settings.security.loginNotifications', icon: BellRing },
] as const;

const portalAccess = [
  { name: 'parentAccessEnabled', label: 'settings.security.parentAccessEnabled', icon: Users },
  { name: 'teacherAccessEnabled', label: 'settings.security.teacherAccessEnabled', icon: Contact },
  { name: 'studentAccessEnabled', label: 'settings.security.studentAccessEnabled', icon: GraduationCap },
] as const;

const groups = [
  { title: 'settings.editor.groups.signIn.title', description: 'settings.editor.groups.signIn.description', fields: signIn },
  { title: 'settings.editor.groups.portalAccess.title', description: 'settings.editor.groups.portalAccess.description', fields: portalAccess },
] as const;

const SecuritySection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>

      {groups.map(({ title, description, fields }) => (
        <SettingsGroup key={title} title={t(title)} description={t(description)} className="gap-0 divide-y divide-border/60 sm:grid-cols-1">
          {fields.map(({ name, label, icon }) => (
            <FormInput
              key={name}
              type="switch"
              name={name}
              label={t(label)}
              icon={icon}
              variant="ghost"
              className="min-h-13 py-2"
            />
          ))}
        </SettingsGroup>
      ))}
    </>
  );
};

export default SecuritySection;
