"use client";

import React from 'react';
import {
  GraduationCap, BookOpen, User, Building, DoorOpen, ListChecks, ClipboardList, UserCircle,
} from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';

const computePercent = (obtained, total) => {
  if (obtained == null || total == null) return null;
  const o = Number(obtained);
  const t = Number(total);
  if (!t || isNaN(o) || isNaN(t)) return null;
  return Math.round((o / t) * 100);
};

const GradeCard = ({ data }: any) => {
  const { t } = useTranslation();
  const g = data;
  const studentName = g.student?.name;
  const studentCode = g.student?.studentCode;
  const teacherName = g.teacher?.name || g.teacher?.email;
  const subjectLabel = g.subject?.code ? `${g.subject?.name} (${g.subject?.code})` : g.subject?.name;
  const source = g.assessment?.id ? g.assessment : g.exam?.id ? g.exam : null;
  const sourceLabel = g.assessment?.id ? t('grades.form.assessment') : 'Exam';
  const totalMarks = source?.totalMarks;
  const passing = source?.passingMarks;
  const pct = computePercent(g.marksObtained, totalMarks);
  const pctColor = pct == null ? '' : pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-600';
  const barColor = pct == null ? 'bg-gray-300' : pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
          <GraduationCap className="w-6 h-6 text-primary dark:text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-md font-bold">{studentName || t('common.notAssigned')}</Label>
          {studentCode && <span className="text-xs text-muted-foreground">{studentCode}</span>}
          {g.status && <NBadge statusMap={STATUS_COLOR_MAP} status={g.status} />}
        </div>

        {pct != null && (
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-sm">
              <span>
                <span className="font-bold text-base">{g.marksObtained}</span>
                <span className="text-muted-foreground"> / {totalMarks}</span>
              </span>
              <span className={`font-semibold ${pctColor}`}>{pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            {passing != null && (
              <div className="text-xs text-muted-foreground">
                {t('grades.form.passingMarksRef')}: {passing}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 mt-1">
          {source?.title && (
            <NSectionInfo
              icon={ClipboardList}
              iconColor="text-primary"
              label={sourceLabel}
              value={source.title}
              valueColor="text-primary"
            />
          )}

          {subjectLabel && (
            <NSectionInfo
              icon={BookOpen}
              iconColor="text-muted-foreground"
              label={t('grades.form.subject')}
              value={subjectLabel}
              valueColor="text-foreground font-medium"
            />
          )}

          {teacherName && (
            <NSectionInfo
              icon={User}
              iconColor="text-muted-foreground"
              label={t('grades.form.teacher')}
              value={teacherName}
              valueColor="text-foreground font-medium"
            />
          )}

          {g.class?.name && (
            <NSectionInfo
              icon={Building}
              iconColor="text-muted-foreground"
              label={t('grades.form.class')}
              value={g.class.name}
              valueColor="text-foreground font-medium"
            />
          )}

          {g.section?.name && (
            <NSectionInfo
              icon={DoorOpen}
              iconColor="text-muted-foreground"
              label={t('grades.form.section')}
              value={g.section.name}
              valueColor="text-foreground font-medium"
            />
          )}

          {g.feedback && (
            <NSectionInfo
              icon={ListChecks}
              iconColor="text-muted-foreground"
              label={t('grades.form.feedback')}
              value={g.feedback}
              valueColor="text-foreground"
            />
          )}

          {g.gradedByUser?.email && (
            <NSectionInfo
              icon={UserCircle}
              iconColor="text-muted-foreground"
              label={t('grades.form.gradedBy')}
              value={g.gradedByUser.email}
              valueColor="text-foreground font-medium"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GradeCard;
