'use client';

import { Mail, MessageSquare, GraduationCap, CalendarCheck, Users, Calendar, BookOpen, CreditCard, AlertCircle } from 'lucide-react';
import { FormInput } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { PushOptIn } from '@/features/Notifications';
import { SettingsGroup } from '../SettingsGroup';

const channels = [
  { name: 'emailNotifications', icon: Mail },
  { name: 'smsNotifications', icon: MessageSquare },
  { name: 'parentNotifications', icon: Users },
] as const;

const academicAlerts = [
  { name: 'academicAlerts', icon: GraduationCap },
  { name: 'attendanceAlerts', icon: CalendarCheck },
  { name: 'eventAlerts', icon: Calendar },
  { name: 'homeworkAlerts', icon: BookOpen },
  { name: 'lowGradeAlerts', icon: AlertCircle },
  { name: 'examResultsAlerts', icon: GraduationCap },
  { name: 'disciplinaryAlerts', icon: AlertCircle },
] as const;

const financialAlerts = [
  { name: 'feesReminder', icon: CreditCard },
  { name: 'feesOverdueAlerts', icon: CreditCard },
] as const;

const groups = [
  { title: 'settings.editor.channels', fields: channels },
  { title: 'settings.editor.academicAlerts', fields: academicAlerts },
  { title: 'settings.editor.financialAlerts', fields: financialAlerts },
] as const;

export default function NotificationSection() {
  const { t } = useTranslation();
  return (
    <>
      {groups.map(({ title, fields }) => (
        <SettingsGroup key={title} title={t(title)} className="gap-0 divide-y divide-border/60 sm:grid-cols-1">
          {fields.map(({ name, icon }) => (
            <FormInput
              key={name}
              type="switch"
              name={name}
              label={t(`settings.notifications.${name}`)}
              icon={icon}
              variant="ghost"
              className="min-h-13 py-2"
            />
          ))}
        </SettingsGroup>
      ))}
      <SettingsGroup title={t('settings.editor.groups.push.title')} description={t('settings.editor.pushHint')} className="sm:grid-cols-1">
        <PushOptIn />
      </SettingsGroup>
    </>
  );
}
