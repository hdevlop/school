'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';
import { shiftLocalISODate } from '@/lib/utils';
import { useSchoolToday } from '@/hooks/useSchoolFormat';

import { changedRosterMarks, rosterMark, type RosterMark, type RosterStatus } from '../config/rosterMarks';
import { changedStaffRosterMarks, staffAttendanceDetails, type StaffAttendanceDetails } from '../config/staffAttendanceDetails';
export type { RosterStatus, RosterMark } from '../config/rosterMarks';
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
  const today = useSchoolToday();
  const [internalDate, setInternalDate] = useState(today);
  const [draft, setDraft] = useState<Record<string, RosterStatus>>({});
  const [detailDraft, setDetailDraft] = useState<Record<string, StaffAttendanceDetails>>({});
  const selectedDate = controlledDate ?? internalDate;

  const setSelectedDate = useCallback((date: string) => {
    if (controlledDate === undefined) setInternalDate(date);
    onDateChange?.(date);
  }, [controlledDate, onDateChange]);

  // Unsaved marks belong to the day they were made for. A controlled date can
  // also move without goToDate, e.g. when the viewed school year changes.
  useEffect(() => {
    setDraft({});
    setDetailDraft({});
  }, [selectedDate, kind, attendanceMode, allSections, studentContext?.sectionId, studentContext?.teacherAssignmentId]);

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

  const getStatus = useCallback((id: string): RosterMark =>
    rosterMark(draft[id], existingByPerson.get(id)?.status, kind === 'student' ? 'present' : 'unmarked'), [draft, existingByPerson, kind]);

  const changes = useMemo(() => kind === 'staff'
    ? changedStaffRosterMarks(roster, draft, detailDraft, existingByPerson)
    : changedRosterMarks(roster, draft, existingByPerson, 'present'), [kind, roster, draft, detailDraft, existingByPerson]);

  const getDetails = useCallback((id: string) => detailDraft[id] ?? staffAttendanceDetails(existingByPerson.get(id)), [detailDraft, existingByPerson]);
  const setDetails = useCallback((id: string, details: StaffAttendanceDetails) => {
    setDetailDraft((previous) => ({ ...previous, [id]: details }));
  }, []);

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
    const s = { total: roster.length, present: 0, absent: 0, late: 0, unmarked: 0 };
    roster.forEach((p) => { s[getStatus(p.id)]++; });
    return s;
  }, [roster, getStatus]);

  const shiftDate = useCallback((days: number) => {
    setSelectedDate(shiftLocalISODate(selectedDate, days));
    setDraft({});
    setDetailDraft({});
  }, [selectedDate, setSelectedDate]);

  const goToDate = useCallback((v: string) => {
    setSelectedDate(v);
    setDraft({});
    setDetailDraft({});
  }, [setSelectedDate]);

  const markAllAs = useCallback((status: RosterStatus) => {
    setDraft((prev) => {
      const next = { ...prev };
      roster.forEach((p) => { next[p.id] = status; });
      return next;
    });
  }, [roster]);

  const resetDraft = useCallback(() => { setDraft({}); setDetailDraft({}); }, []);

  const handleSubmit = useCallback(async () => {
    if (kind === 'student' && !allSections && !studentContext?.sectionId) {
      toast.error(t('attendance.errors.selectSection'));
      return;
    }

    if (kind === 'student' && !allSections && attendanceMode === 'per_class' && (!studentContext?.teacherId || !studentContext?.subjectId)) {
      toast.error(t('attendance.errors.selectTeacherSubject'));
      return;
    }

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
      if (kind === 'staff') {
        const details = getDetails(person.id);
        payload.arrivalTime = details.arrivalTime || null;
        payload.notes = details.notes;
      }
      return payload;
    });

    try {
      await onSubmitBatch(payloads);
      toast.success(t('attendance.roster.submitSuccess'));
      setDraft({});
      setDetailDraft({});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t('attendance.roster.submitError'));
    }
  }, [changes, kind, fkKey, selectedDate, onSubmitBatch, studentContext, attendanceMode, allSections, t, getDetails]);

  const hasChanges = changes.length > 0;
  const isToday = selectedDate === today;
  const goToToday = useCallback(() => goToDate(today), [goToDate, today]);

  return {
    selectedDate,
    hasChanges,
    isToday,
    stats,
    getStatus,
    setStatus,
    getDetails,
    setDetails,
    shiftDate,
    goToDate,
    goToToday,
    markAllAs,
    resetDraft,
    handleSubmit,
  };
};
