"use client";

import React from 'react';
import { User, GraduationCap, BookOpen, IdCard } from 'lucide-react';
import { NAvatar } from 'najm-kit';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { avatarVersion } from '@/lib/avatarVersion';
import { PersonCard } from '@/shared/PersonCard';



const StudentCard = ({ data }) => {
  const { t } = useTranslation();
  const student = data;
  const arabicName = student.arabicName?.trim();
  const massarCode = student.studentCode?.trim();

  const getGenderDisplay = (gender: 'M' | 'F') =>
    gender === 'M' ? t('common.male') : t('common.female');

  return (
    <PersonCard
      avatar={(
        <NAvatar
          src={student?.image}
          fallback={student.name}
          size="lg"
          version={avatarVersion(student?.image, student?.updatedAt)}
        />
      )}
      name={student.name}
      meta={arabicName && (
        <p lang="ar" dir="rtl" className="w-full text-left text-sm text-foreground break-words">
          {arabicName}
        </p>
      )}
    >
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
    </PersonCard>
  );
};

export default StudentCard;
