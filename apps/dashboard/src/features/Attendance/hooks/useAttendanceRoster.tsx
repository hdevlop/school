'use client';

import { useMemo, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';
import { shiftLocalISODate, toLocalISODate } from '@/lib/localDate';

export type RosterStatus = 'present' | 'absent' | 'late';
type Kind = 'student' | 'staff';

interface Options {
  kind: Kind;
  roster: any[];
  existingAttendance: any[];
  onSubmitBatch: (items: any[]) => Promise<any>;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  attendanceMode?: 'daily' | 'per_class';
  allSections?: boolean;
  studentContext?: {
    sectionId: string;
    teacherId?: string;
    subjectId?: string;
    teacherAssignmentId?: string;
  } | null;
}

export const useAttendanceRoster = ({
  kind,
  roster,
  existingAttendance,
  onSubmitBatch,
  selectedDate: controlledDate,
  onDateChange,
  attendanceMode = 'daily',
  allSections = false,
  studentContext = null,
}: Options) => {
  const { t } = useTranslation();
  const [internalDate, setInternalDate] = useState(toLocalISODate);
  const [draft, setDraft] = useState<Record<string, RosterStatus>>({});
  const selectedDate = controlledDate ?? internalDate;

  const setSelectedDate = useCallback((date: string) => {
    if (controlledDate === undefined) setInternalDate(date);
    onDateChange?.(date);
  }, [controlledDate, onDateChange]);

  const fkKey = kind === 'student' ? 'studentId' : 'staffId';

  const existingByPerson = useMemo(() => {
    const map = new Map<string, any>();

    if (kind === 'student' && !allSections && !studentContext?.sectionId) {
      return map;
    }

    const matchBySection = kind === 'student' && attendanceMode === 'daily';

    existingAttendance.forEach((rec) => {
      if (rec.date !== selectedDate || !rec[fkKey]) {
        return;
      }

      if (kind === 'student' && !allSections) {
        if (matchBySection) {
          const recSectionId = rec.sectionId ?? rec.section?.id;
          if (recSectionId !== studentContext?.sectionId) return;
        } else {
          if (!studentContext?.teacherAssignmentId) return;
          if (rec.teacherAssignmentId !== studentContext.teacherAssignmentId) return;
        }
      }

      map.set(rec[fkKey], rec);
    });
    return map;
  }, [existingAttendance, selectedDate, fkKey, kind, attendanceMode, allSections, studentContext?.sectionId, studentContext?.teacherAssignmentId]);

  const getStatus = useCallback((id: string): RosterStatus => {
    if (draft[id]) return draft[id];
    const existing = existingByPerson.get(id);
    if (existing && ['present', 'absent', 'late'].includes(existing.status)) return existing.status;
    return 'present';
  }, [draft, existingByPerson]);

  const setStatus = useCallback((id: string, status: RosterStatus) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (existingByPerson.get(id)?.status === status) {
        delete next[id];
      } else {
        next[id] = status;
      }
      return next;
    });
  }, [existingByPerson]);

  const stats = useMemo(() => {
    const s = { total: roster.length, present: 0, absent: 0, late: 0 };
    roster.forEach((p) => { s[getStatus(p.id)]++; });
    return s;
  }, [roster, getStatus]);

  const shiftDate = useCallback((days: number) => {
    setSelectedDate(shiftLocalISODate(selectedDate, days));
    setDraft({});
  }, [selectedDate, setSelectedDate]);

  const goToDate = useCallback((v: string) => {
    setSelectedDate(v);
    setDraft({});
  }, [setSelectedDate]);

  const markAllAs = useCallback((status: RosterStatus) => {
    setDraft((prev) => {
      const next = { ...prev };
      roster.forEach((p) => { next[p.id] = status; });
      return next;
    });
  }, [roster]);

  const resetDraft = useCallback(() => setDraft({}), []);

  const handleSubmit = useCallback(async () => {
    if (kind === 'student' && !allSections && !studentContext?.sectionId) {
      toast.error(t('attendance.errors.selectSection'));
      return;
    }

    if (kind === 'student' && !allSections && attendanceMode === 'per_class' && (!studentContext?.teacherId || !studentContext?.subjectId)) {
      toast.error(t('attendance.errors.selectTeacherSubject'));
      return;
    }

    const changes = roster
      .map((p) => {
        const existing = existingByPerson.get(p.id);
        const current = getStatus(p.id);
        if (existing && existing.status === current) return null;
        return { person: p, status: current, existing };
      })
      .filter(Boolean) as { person: any; status: RosterStatus; existing?: any }[];

    if (changes.length === 0) {
      toast.info(t('attendance.roster.nothingToSave'));
      return;
    }

    const payloads = changes.map(({ person, status, existing }) => {
      const payload: any = {
        type: kind,
        [fkKey]: person.id,
        date: selectedDate,
        status,
      };
      if (kind === 'student') {
        payload.sectionId = allSections ? person.sectionId : studentContext?.sectionId;
        if (!allSections && studentContext?.teacherId) payload.teacherId = studentContext.teacherId;
        if (!allSections && studentContext?.subjectId) payload.subjectId = studentContext.subjectId;
      }
      if (existing) payload.id = existing.id;
      return payload;
    });

    try {
      await onSubmitBatch(payloads);
      toast.success(t('attendance.roster.submitSuccess'));
      setDraft({});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t('attendance.roster.submitError'));
    }
  }, [roster, existingByPerson, getStatus, kind, fkKey, selectedDate, onSubmitBatch, studentContext, attendanceMode, allSections, t]);

  const hasUnrecordedRows = useMemo(
    () => kind === 'staff' && roster.some((person) => !existingByPerson.has(person.id)),
    [kind, roster, existingByPerson],
  );
  const hasChanges = Object.keys(draft).length > 0 || hasUnrecordedRows;
  const isToday = selectedDate === toLocalISODate();
  const goToToday = useCallback(() => goToDate(toLocalISODate()), [goToDate]);

  return {
    selectedDate,
    hasChanges,
    isToday,
    stats,
    getStatus,
    setStatus,
    shiftDate,
    goToDate,
    goToToday,
    markAllAs,
    resetDraft,
    handleSubmit,
  };
};
