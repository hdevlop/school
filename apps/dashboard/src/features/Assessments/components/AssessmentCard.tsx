"use client";

import React from 'react';
import {
  ClipboardList, BookOpen, User, Building, DoorOpen, Calendar, Clock, Award,
} from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';
import { ASSESSMENT_STATUS_COLORS, ASSESSMENT_TYPE_COLORS } from '../assessmentBadgeColors';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

const formatDuration = (mins) => {
  if (mins == null) return null;
  const m = Number(mins);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h}h ${rest}m` : `${h}h`;
  }
  return `${m}m`;
};

const AssessmentCard = ({ data }: any) => {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();
  const a = data;
  const teacherName = a.teacher?.name || a.teacher?.email;
  const subjectLabel = a.subject?.code ? `${a.subject?.name} (${a.subject?.code})` : a.subject?.name;
  const date = a.date ? displayDateOnly(a.date) : null;
  const duration = formatDuration(a.duration);
  const description = [a.description, a.instructions].filter(Boolean).join('\n\n');
  const passingDisplay = a.passingMarks != null ? `${a.passingMarks} / ${a.totalMarks}` : `${a.totalMarks}`;
  const additionalSections = Math.max((a.sectionIds?.length || 0) - (a.section?.name ? 1 : 0), 0);
  const sectionLabel = a.section?.name
    ? `${a.section.name}${additionalSections ? ` +${additionalSections}` : ''}`
    : a.sectionIds?.length
      ? `${a.sectionIds.length} sections`
      : null;

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
          <ClipboardList className="w-6 h-6 text-primary dark:text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-md font-bold">{a.title}</Label>
          {a.type && <NBadge color={ASSESSMENT_TYPE_COLORS[a.type]} label={t(`assessments.type.${a.type}`)} look="soft" />}
          {a.status && <NBadge color={ASSESSMENT_STATUS_COLORS[a.status]} label={t(`assessments.status.${a.status}`)} look="soft" />}
        </div>

        {description && (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {description}
          </div>
        )}

        <div className="space-y-2">
          {subjectLabel && (
            <NSectionInfo
              icon={BookOpen}
              iconColor="text-primary"
              label={t('assessments.form.subject')}
              value={subjectLabel}
              valueColor="text-primary"
            />
          )}

          {teacherName && (
            <NSectionInfo
              icon={User}
              iconColor="text-muted-foreground"
              label={t('assessments.form.teacher')}
              value={teacherName}
              valueColor="text-foreground font-medium"
            />
          )}

          {a.class?.name && (
            <NSectionInfo
              icon={Building}
              iconColor="text-muted-foreground"
              label={t('assessments.form.class')}
              value={a.class.name}
              valueColor="text-foreground font-medium"
            />
          )}

          {sectionLabel && (
            <NSectionInfo
              icon={DoorOpen}
              iconColor="text-muted-foreground"
              label={t('assessments.form.section')}
              value={sectionLabel}
              valueColor="text-foreground font-medium"
            />
          )}

          {date && (
            <NSectionInfo
              icon={Calendar}
              iconColor="text-muted-foreground"
              label={t('assessments.form.date')}
              value={date}
              valueColor="text-foreground font-medium"
            />
          )}

          {duration && (
            <NSectionInfo
              icon={Clock}
              iconColor="text-muted-foreground"
              label={t('assessments.form.duration')}
              value={duration}
              valueColor="text-foreground font-medium"
            />
          )}

          {a.totalMarks != null && (
            <NSectionInfo
              icon={Award}
              iconColor="text-muted-foreground"
              label={t('assessments.form.totalMarks')}
              value={passingDisplay}
              valueColor="text-foreground font-medium"
            />
          )}

        </div>
      </div>
    </div>
  );
};

export default AssessmentCard;
