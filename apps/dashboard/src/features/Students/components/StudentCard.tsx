"use client";

import React from 'react';
import { User, GraduationCap, BookOpen, IdCard } from 'lucide-react';
import { NAvatar } from 'najm-kit';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';
import { avatarVersion } from '@/lib/avatarVersion';



const StudentCard = ({ data }) => {
  const { t } = useTranslation();
  const student = data;
  const arabicName = student.arabicName?.trim();
  const massarCode = student.studentCode?.trim();
  
  const getGenderDisplay = (gender: 'M' | 'F') =>
    gender === 'M' ? t('common.male') : t('common.female');

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <NAvatar
          src={student?.image}
          fallback={student.name}
          size="lg"
          version={avatarVersion(student?.image, student?.updatedAt)}
        />
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <div className="space-y-1">
          <Label className="text-md font-bold break-words">
            {student.name}
          </Label>
          {arabicName && (
            <p lang="ar" dir="rtl" className="text-left text-sm text-foreground break-words">
              {arabicName}
            </p>
          )}
        </div>

        <div className="space-y-2">
          {massarCode && (
            <NSectionInfo
              icon={IdCard}
              iconColor="text-muted-foreground"
              label={t('students.card.massarCode')}
              value={<bdi dir="ltr" className="font-mono break-all">{massarCode}</bdi>}
            />
          )}
          <NSectionInfo
            icon={User}
            iconColor="text-muted-foreground"
            label={t('students.table.gender')}
            value={getGenderDisplay(student.gender)}
          />

          <NSectionInfo
            icon={GraduationCap}
            iconColor="text-primary"
            label={t('students.table.class')}
            value={student.class.name}
            valueColor="text-primary"
          />

          <NSectionInfo
            icon={BookOpen}
            iconColor="text-primary"
            label={t('students.table.section')}
            value={student.section.name}
            valueColor="text-primary"
          />
        </div>
      </div>
    </div>
  );
};

export default StudentCard;
