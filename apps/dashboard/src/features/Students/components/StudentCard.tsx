"use client";

import React from 'react';
import { User, GraduationCap, BookOpen, IdCard, Mars, Venus } from 'lucide-react';
import { NAvatar, NSectionInfo, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { avatarVersion } from '@/lib/avatarVersion';
import { PersonCard } from '@/shared/PersonCard';
import { CompactPersonCard, CompactTag, CompactValue, useCompactPersonCard } from '@/shared/CompactPersonCard';

const GENDER_TONE = {
  F: 'text-pink-600 dark:text-pink-400',
  M: 'text-blue-600 dark:text-blue-400',
} as const;

/** One line of identity and one of placement: a phone list shows five or six students at a time. */
function CompactStudentCard({ student }) {
  const { t } = useTranslation();
  const arabicName = student.arabicName?.trim();
  const massarCode = student.studentCode?.trim();
  const tone = GENDER_TONE[student.gender as keyof typeof GENDER_TONE];
  const GenderIcon = student.gender === 'F' ? Venus : student.gender === 'M' ? Mars : null;
  const genderLabel = student.gender === 'F' ? t('common.female') : t('common.male');
  const placement = [student.class?.name, student.section?.name].filter(Boolean).join(' · ');

  return (
    <CompactPersonCard
      avatar={<NAvatar src={student.image} fallback={student.name} size="md" version={avatarVersion(student.image, student.updatedAt)} />}
      name={student.name}
      aside={arabicName && <span lang="ar" dir="rtl" className="min-w-0 truncate text-sm text-foreground/80">{arabicName}</span>}
      details={[
        massarCode && <CompactValue mono>{massarCode}</CompactValue>,
        placement && <span className="flex shrink-0" aria-label={`${t('students.table.class')} ${student.class?.name ?? ''}, ${t('students.table.section')} ${student.section?.name ?? ''}`}>
          <CompactTag>{placement}</CompactTag>
        </span>,
      ]}
      trailing={GenderIcon && <GenderIcon className={cn('size-3.5 shrink-0', tone)} aria-label={genderLabel} role="img" />}
    />
  );
}

const StudentCard = ({ data }) => {
  const { t } = useTranslation();
  const isPhone = useCompactPersonCard();
  const student = data;
  const arabicName = student.arabicName?.trim();
  const massarCode = student.studentCode?.trim();

  if (isPhone) return <CompactStudentCard student={student} />;

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
