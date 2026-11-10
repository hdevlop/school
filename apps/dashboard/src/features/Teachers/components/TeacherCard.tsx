"use client";

import React from 'react';
import { Phone, GraduationCap, Mail } from 'lucide-react';
import { NAvatar, NBadge } from 'najm-kit';
import { NCardInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useRouter } from 'next/navigation';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSubjects } from '@/features/Subjects/hooks/useSubjects';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { avatarVersion } from '@/lib/avatarVersion';
import { PersonCard } from '@/shared/PersonCard';
import { CompactPersonCard, CompactTag, CompactValue, useCompactPersonCard } from '@/shared/CompactPersonCard';

const VISIBLE_SUBJECTS = 2;
const TAG = 'rounded-full bg-primary/10 font-medium text-primary ring-1 ring-inset ring-primary/20';
const PENDING = 'bg-amber-100 font-medium text-amber-900 ring-1 ring-inset ring-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-700';

const TeacherCard = ({ data }) => {
   const { t } = useTranslation();
   const router = useRouter();
   const compact = useCompactPersonCard();
   const teacher = data;
   const openTeacher = () => router.push(`/teachers/${teacher.id}`);

   const { viewingYear } = useViewingAcademicYear();
   const { classes = [] } = useClasses({ enabled: !!viewingYear });
   const { subjects = [] } = useSubjects();

   // The subjects this teacher teaches this year, as the staff card shows a role.
   const taught = [...new Set((teacher.assignments ?? []).flatMap(assignment => assignment.subjectIds ?? []))]
      .map(id => subjects.find(subject => subject.id === id)).filter(Boolean);
   const subjectNames = taught.map(subject => subject.name);
   // A card's tag row is narrow: one subject reads in full, several by their
   // codes (AR, EI…, as the Notes filters name them), so two always fit.
   const subjectTags = taught.length > 1 ? taught.map(subject => subject.code || subject.name) : subjectNames;
   const hiddenSubjects = subjectNames.length - VISIBLE_SUBJECTS;

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
            trailing={teacher.loginStatus === 'pending' && <NBadge className={`shrink-0 ${PENDING}`}>{t('staff.invitation.accessPending')}</NBadge>}
            details={[
               subjectNames.length ? <span key="subjects" className="flex min-w-0 shrink-0 items-center gap-1">
                  <CompactTag>{subjectNames[0]}</CompactTag>
                  {subjectNames.length > 1 && <CompactTag><bdi dir="ltr">+{subjectNames.length - 1}</bdi></CompactTag>}
               </span> : teacher.specialization && <CompactTag>{teacher.specialization}</CompactTag>,
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
         // One row whatever the number of subjects, so every card has the same
         // shape: the first two subjects, "+N" for the others (all of them in
         // the tooltip), and the pending access on the same line. The subjects
         // shorten when the row runs out of room; "+N" never does.
         meta={(
            <span className="flex min-w-0 flex-nowrap items-center gap-1" title={subjectNames.join(', ') || undefined}>
               {subjectNames.length ? (
                  <>
                     {subjectTags.slice(0, VISIBLE_SUBJECTS).map(tag => (
                        <NBadge key={tag} className={`min-w-0 shrink truncate ${TAG}`}><span className="truncate">{tag}</span></NBadge>
                     ))}
                     {hiddenSubjects > 0 && <NBadge className={`shrink-0 ${TAG}`}><bdi dir="ltr">+{hiddenSubjects}</bdi></NBadge>}
                  </>
               ) : teacher.specialization && <NBadge className={`min-w-0 shrink truncate ${TAG}`}><span className="truncate">{teacher.specialization}</span></NBadge>}
               {teacher.loginStatus === 'pending' && <NBadge className={`shrink-0 ${PENDING}`}>{t('staff.invitation.accessPending')}</NBadge>}
            </span>
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
