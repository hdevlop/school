'use client'

import React from 'react';
import { Bell, Mail, MessageSquare, GraduationCap, CalendarCheck, Users, Calendar, BookOpen, CreditCard, AlertCircle } from 'lucide-react';
import { FormInput } from 'najm-kit';

import { useTranslation } from '@/hooks/useLanguage';
import { Label } from 'najm-kit';
const NotificationSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">

      <div className="flex items-center gap-2 font-semibold text-sm">
        <Bell className="h-5 w-5" />
        <Label className='text-lg'> {t('settings.notifications.title')} </Label>
      </div>

      <div className="flex flex-col gap-3 ">
        <FormInput
          type="switch"
          name="academicAlerts"
          label={t('settings.notifications.academicAlerts') }
          icon={GraduationCap}
          iconColor="#3b82f6"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="attendanceAlerts"
          label={t('settings.notifications.attendanceAlerts') }
          icon={CalendarCheck}
          iconColor="#f97316"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="eventAlerts"
          label={t('settings.notifications.eventAlerts') }
          icon={Calendar}
          iconColor="#06b6d4"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="homeworkAlerts"
          label={t('settings.notifications.homeworkAlerts') }
          icon={BookOpen}
          iconColor="#d946ef"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="feesReminder"
          label={t('settings.notifications.feesReminder') }
          icon={CreditCard}
          iconColor="#16a34a"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="parentNotifications"
          label={t('settings.notifications.parentNotifications') }
          icon={Users}
          iconColor="#10b981"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="emailNotifications"
          label={t('settings.notifications.emailNotifications') }
          icon={Mail}
          iconColor="#8b5cf6"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="smsNotifications"
          label={t('settings.notifications.smsNotifications') }
          icon={MessageSquare}
          iconColor="#ec4899"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="lowGradeAlerts"
          label={t('settings.notifications.lowGradeAlerts')}
          icon={AlertCircle}
          iconColor="#ef4444"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="feesOverdueAlerts"
          label={t('settings.notifications.feesOverdueAlerts')}
          icon={CreditCard}
          iconColor="#dc2626"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="examResultsAlerts"
          label={t('settings.notifications.examResultsAlerts')}
          icon={GraduationCap}
          iconColor="#059669"
          variant="ghost"
        />

        <FormInput
          type="switch"
          name="disciplinaryAlerts"
          label={t('settings.notifications.disciplinaryAlerts')}
          icon={AlertCircle}
          iconColor="#f59e0b"
          variant="ghost"
        />
      </div>
    </div>
  );
};

export default NotificationSection;