"use client";

import React, { useMemo, useState } from 'react';
import { GraduationCap, BookOpen, Award, ClipboardList } from 'lucide-react';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { Label } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
import { useStudents } from '@/features/Students/hooks/useStudents';
import { useStudentReport } from '../hooks/useGrades';
import PageLoadingState from '@/shared/PageLoadingState';

const gpaColor = (gpa) => {
  if (gpa == null) return 'text-gray-400';
  if (gpa >= 3) return 'text-emerald-600';
  if (gpa >= 2) return 'text-amber-600';
  if (gpa >= 1) return 'text-orange-600';
  return 'text-rose-600';
};

const pctColor = (pct) => {
  if (pct == null) return '';
  if (pct >= 75) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-rose-600';
};

const barColor = (pct) => {
  if (pct == null) return 'bg-gray-300';
  if (pct >= 75) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
};

const fmtPct = (n) => (n == null ? '—' : `${Math.round(n)}%`);
const fmtGpa = (n) => (n == null ? '—' : Number(n).toFixed(2));

const StudentReportCard = ({ studentId: initialStudentId = null }: { studentId?: string | null }) => {
  const { t } = useTranslation();
  const { students, isStudentsLoading } = useStudents();
  const [studentId, setStudentId] = useState<string | null>(initialStudentId);
  const { data: report, isLoading: isReportLoading } = useStudentReport(studentId);

  const selectedStudent = useMemo(
    () => (students || []).find((s) => s.id === studentId),
    [students, studentId]
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Student picker */}
      <div className="flex flex-col gap-1">
        <Label className="text-sm font-medium">{t('grades.report.selectStudent')}</Label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={studentId || ''}
          onChange={(e) => setStudentId(e.target.value || null)}
          disabled={isStudentsLoading}
        >
          <option value="">{t('grades.form.studentPlaceholder')}</option>
          {(students || []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.studentCode ? `${s.name} (${s.studentCode})` : s.name}
            </option>
          ))}
        </select>
      </div>

      {!studentId && (
        <div className="text-sm text-muted-foreground py-8 text-center">
          {t('grades.report.selectStudent')}
        </div>
      )}

      {studentId && isReportLoading && (
        <PageLoadingState label={t('common.loading')} className="min-h-64" />
      )}

      {studentId && !isReportLoading && report && (
        <>
          {/* Header */}
          <div className="flex items-start gap-4 border rounded-lg p-4">
            <div className="shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
                <GraduationCap className="w-6 h-6 text-primary dark:text-white" />
              </div>
            </div>
            <div className="flex-1">
              <Label className="text-md font-bold">
                {selectedStudent?.name || studentId}
              </Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <div className="text-xs text-muted-foreground">{t('grades.report.overallGPA')}</div>
                  <div className={`text-2xl font-bold ${gpaColor(report.gpa)}`}>{fmtGpa(report.gpa)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('grades.report.averagePercentage')}</div>
                  <div className={`text-2xl font-bold ${pctColor(report.averagePercentage)}`}>
                    {fmtPct(report.averagePercentage)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('grades.report.totalGrades')}</div>
                  <div className="text-2xl font-bold">{report.totalGrades ?? 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Per-subject breakdown */}
          {(!report.subjects || report.subjects.length === 0) ? (
            <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
              {t('grades.report.noGradesRecorded')}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {report.subjects.map((sub, i) => {
                const subName = sub.subject?.name || t('common.notAssigned');
                const subCode = sub.subject?.code;
                return (
                  <div key={sub.subject?.id || i} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="font-medium">{subName}</span>
                        {subCode && <span className="text-xs text-muted-foreground">{subCode}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span>
                          {t('grades.report.subjectGPA')}:{' '}
                          <span className={`font-bold ${gpaColor(sub.gpa)}`}>{fmtGpa(sub.gpa)}</span>
                        </span>
                        <span>
                          {t('grades.report.subjectAverage')}:{' '}
                          <span className={`font-bold ${pctColor(sub.averagePercentage)}`}>
                            {fmtPct(sub.averagePercentage)}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mb-2">
                      {sub.totalMarksObtained ?? 0} / {sub.totalPossibleMarks ?? 0}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {(sub.grades || []).map((grade) => {
                        const pct = grade.percentage ?? null;
                        const source = grade.assessment?.id ? grade.assessment : grade.exam?.id ? grade.exam : null;
                        return (
                          <div key={grade.id} className="flex flex-col gap-1 py-1.5 border-t first:border-t-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <ClipboardList className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                <span className="text-sm truncate" title={source?.title}>
                                  {source?.title || '—'}
                                </span>
                                {source?.type && <NBadge statusMap={STATUS_COLOR_MAP} status={source.type} />}
                              </div>
                              <div className="flex items-center gap-2 text-sm shrink-0">
                                <Award className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>
                                  <span className="font-medium">{grade.marksObtained}</span>
                                  <span className="text-muted-foreground"> / {grade.totalMarks}</span>
                                </span>
                                <span className={`font-semibold ${pctColor(pct)}`}>{fmtPct(pct)}</span>
                                {grade.status && <NBadge statusMap={STATUS_COLOR_MAP} status={grade.status} />}
                              </div>
                            </div>
                            {pct != null && (
                              <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                                <div className={`h-full ${barColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
                              </div>
                            )}
                            {grade.feedback && (
                              <div className="text-xs text-muted-foreground italic" title={grade.feedback}>
                                {grade.feedback}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentReportCard;
