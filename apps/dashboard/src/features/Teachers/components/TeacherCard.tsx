"use client";

import React from 'react';
import { Phone, GraduationCap, Mail } from 'lucide-react';
import { NAvatar, NBadge } from 'najm-kit';
import { NCardInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useRouter } from 'next/navigation';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { avatarVersion } from '@/lib/avatarVersion';
import { PersonCard } from '@/shared/PersonCard';
import { CompactPersonCard, CompactTag, CompactValue, useCompactPersonCard } from '@/shared/CompactPersonCard';

const TeacherCard = ({ data }) => {
   const { t } = useTranslation();
   const router = useRouter();
   const compact = useCompactPersonCard();
   const teacher = data;
   const openTeacher = () => router.push(`/teachers/${teacher.id}`);

   const { viewingYear } = useViewingAcademicYear();
   const { classes = [] } = useClasses({ enabled: !!viewingYear });

   const getClassName = (classId) => {
      const classItem = classes.find(c => c.id === classId);
      return classItem?.name || classId;
   };

   const getAllClasses = () => {
      if (!teacher.assignments || teacher.assignments.length === 0) return '-';
      const classIds = teacher.assignments.map(a => a.classId);
      const uniqueClassIds = [...new Set(classIds)];
      return uniqueClassIds.map(id => getClassName(id)).join(', ');
   };

   const cardProps = {
      role: 'link',
      tabIndex: 0,
      'aria-label': teacher.name,
      onClick: openTeacher,
      onKeyDown: (event: React.KeyboardEvent) => {
         if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openTeacher();
         }
      },
      className: 'cursor-pointer transition-all hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
   };

   // Phones: specialization and classes, or the phone for a teacher with no classes yet.
   if (compact) {
      const classNames = getAllClasses();
      return (
         <CompactPersonCard
            {...cardProps}
            avatar={<NAvatar src={teacher?.image} fallback={teacher.name} size="md" version={avatarVersion(teacher?.image, teacher?.updatedAt)} />}
            name={teacher.name}
            details={[
               teacher.specialization && <CompactTag>{teacher.specialization}</CompactTag>,
               classNames !== '-' ? <span className="min-w-0 truncate">{classNames}</span>
                  : teacher.phone && <CompactValue>{teacher.phone}</CompactValue>,
            ]}
         />
      );
   }

   return (
      <PersonCard
         {...cardProps}
         avatar={<NAvatar src={teacher?.image} fallback={teacher.name} size="lg" version={avatarVersion(teacher?.image, teacher?.updatedAt)} />}
         name={teacher.name}
         meta={teacher.specialization && (
            <NBadge className="rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
               {teacher.specialization}
            </NBadge>
         )}
      >
         {/* NCardInfo truncates to the card width, so a long email
             ends in an ellipsis instead of running under the border. */}
         <NCardInfo
            icon={Phone}
            label={t('teachers.table.phone')}
            value={teacher.phone}
         />

         <NCardInfo
            icon={Mail}
            label={t('teachers.table.email')}
            value={teacher.email}
         />

         <NCardInfo
            icon={GraduationCap}
            label={t('teachers.table.classes')}
            value={getAllClasses()}
            iconClassName="text-primary"
            valueClassName="text-primary"
         />
      </PersonCard>
   );
};

export default TeacherCard;
