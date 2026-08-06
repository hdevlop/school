"use client";

import React from 'react';
import {
  GraduationCap, BookOpen, User, Building, DoorOpen, Calendar, Clock, Award, Hash,
} from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { useTranslation } from '@/hooks/useLanguage';
import { Label } from 'najm-kit';

const formatDate = (value) => {
  if (!value) return null;
  try { return new Date(value).toLocaleString(); } catch { return String(value); }
};

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

const ExamCard = ({ data }: any) => {
  const { t } = useTranslation();
  const e = data;
  const teacherName = e.teacher?.name || e.teacher?.email;
  const subjectLabel = e.subject?.code ? `${e.subject?.name} (${e.subject?.code})` : e.subject?.name;
  const date = formatDate(e.date);
  const duration = formatDuration(e.duration);
  const description = [e.description, e.instructions].filter(Boolean).join('\n\n');
  const passingDisplay = e.passingMarks != null ? `${e.passingMarks} / ${e.totalMarks}` : `${e.totalMarks}`;
  const additionalSections = Math.max((e.sectionIds?.length || 0) - (e.section?.name ? 1 : 0), 0);
  const sectionLabel = e.section?.name
    ? `${e.section.name}${additionalSections ? ` +${additionalSections}` : ''}`
    : e.sectionIds?.length
      ? `${e.sectionIds.length} sections`
      : null;

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
          <GraduationCap className="w-6 h-6 text-primary dark:text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-md font-bold">{e.title}</Label>
          {e.type && <NBadge statusMap={STATUS_COLOR_MAP} status={e.type} />}
          {e.status && <NBadge statusMap={STATUS_COLOR_MAP} status={e.status} />}
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
              label={t('exams.form.subject')}
              value={subjectLabel}
              valueColor="text-primary"
            />
          )}

          {teacherName && (
            <NSectionInfo
              icon={User}
              iconColor="text-muted-foreground"
              label={t('exams.form.teacher')}
              value={teacherName}
              valueColor="text-foreground font-medium"
            />
          )}

          {e.class?.name && (
            <NSectionInfo
              icon={Building}
              iconColor="text-muted-foreground"
              label={t('exams.form.class')}
              value={e.class.name}
              valueColor="text-foreground font-medium"
            />
          )}

          {sectionLabel && (
            <NSectionInfo
              icon={DoorOpen}
              iconColor="text-muted-foreground"
              label={t('exams.form.section')}
              value={sectionLabel}
              valueColor="text-foreground font-medium"
            />
          )}

          {date && (
            <NSectionInfo
              icon={Calendar}
              iconColor="text-muted-foreground"
              label={t('exams.form.date')}
              value={date}
              valueColor="text-foreground font-medium"
            />
          )}

          {duration && (
            <NSectionInfo
              icon={Clock}
              iconColor="text-muted-foreground"
              label={t('exams.form.duration')}
              value={duration}
              valueColor="text-foreground font-medium"
            />
          )}

          {e.totalMarks != null && (
            <NSectionInfo
              icon={Award}
              iconColor="text-muted-foreground"
              label={t('exams.form.totalMarks')}
              value={passingDisplay}
              valueColor="text-foreground font-medium"
            />
          )}

          {e.roomNumber != null && (
            <NSectionInfo
              icon={Hash}
              iconColor="text-muted-foreground"
              label={t('exams.form.roomNumber')}
              value={String(e.roomNumber)}
              valueColor="text-foreground font-medium"
            />
          )}

        </div>
      </div>
    </div>
  );
};

export default ExamCard;
