'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';
import { shiftLocalISODate } from '@/lib/utils';
import { useSchoolToday } from '@/hooks/useSchoolFormat';

import { rosterMark, type RosterMark, type RosterStatus } from '../config/rosterMarks';
import { changedStaffRosterMarks, staffAttendanceDetails, type StaffAttendanceDetails } from '../config/staffAttendanceDetails';
import { clearSavedStudentMarks, clearSubmittedStudentMarks, indexStudentMarks, stageStudentRoster, studentMarkKey, studentRosterItem, studentRosterSubmission, type StudentRosterDraft } from '../config/studentRosterDraft';
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
  const studentScope = JSON.stringify([selectedDate, attendanceMode]);
  const [studentPending, setStudentPending] = useState<{ scope: string; items: StudentRosterDraft }>({ scope: studentScope, items: {} });
  const studentDraft = useMemo(() => studentPending.scope === studentScope ? studentPending.items : {}, [studentPending, studentScope]);
  const studentRosterContext = useMemo(() => ({
    date: selectedDate, attendanceMode, allSections,
    sectionId: studentContext?.sectionId,
    teacherId: studentContext?.teacherId,
    subjectId: studentContext?.subjectId,
    teacherAssignmentId: studentContext?.teacherAssignmentId,
  }), [selectedDate, attendanceMode, allSections, studentContext?.sectionId, studentContext?.teacherId, studentContext?.subjectId, studentContext?.teacherAssignmentId]);
  const savedStudentMarks = useMemo(() => indexStudentMarks(existingAttendance), [existingAttendance]);
  const peopleById = useMemo(() => new Map(roster.map(person => [person.id, person])), [roster]);
  const studentPayloads = useMemo(() => kind === 'student'
    ? studentRosterSubmission(roster, studentDraft, savedStudentMarks, studentRosterContext)
    : [], [kind, roster, studentDraft, savedStudentMarks, studentRosterContext]);

  useEffect(() => {
    if (kind !== 'student') return;
    setStudentPending(previous => {
      const items = clearSavedStudentMarks(previous.items, savedStudentMarks);
      return Object.keys(items).length === Object.keys(previous.items).length ? previous : { ...previous, items };
    });
  }, [kind, savedStudentMarks]);

  const setSelectedDate = useCallback((date: string) => {
    if (controlledDate === undefined) setInternalDate(date);
    onDateChange?.(date);
  }, [controlledDate, onDateChange]);

  // Unsaved marks belong to the day they were made for. A controlled date can
  // also move without goToDate, e.g. when the viewed school year changes.
  useEffect(() => {
    setDraft({});
    setDetailDraft({});
    setStudentPending({ scope: studentScope, items: {} });
  }, [studentScope, kind]);

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

  const getStatus = useCallback((id: string): RosterMark => {
    if (kind === 'student') {
      const person = peopleById.get(id);
      const item = person && studentRosterItem(person, studentRosterContext);
      const key = item && studentMarkKey(item);
      return key ? rosterMark(studentDraft[key]?.status, savedStudentMarks.get(key)?.status, 'present') : 'present';
    }
    return rosterMark(draft[id], existingByPerson.get(id)?.status, 'present');
  }, [draft, existingByPerson, kind, peopleById, studentRosterContext, studentDraft, savedStudentMarks]);

  const changes = useMemo(() => kind === 'staff'
    ? changedStaffRosterMarks(roster, draft, detailDraft, existingByPerson)
    : [], [kind, roster, draft, detailDraft, existingByPerson]);

  const getDetails = useCallback((id: string) => detailDraft[id] ?? staffAttendanceDetails(existingByPerson.get(id)), [detailDraft, existingByPerson]);
  const setDetails = useCallback((id: string, details: StaffAttendanceDetails) => {
    setDetailDraft((previous) => ({ ...previous, [id]: details }));
  }, []);

  const setStatuses = useCallback((marks: Record<string, RosterStatus>) => {
    if (kind === 'student') {
      setStudentPending(previous => ({ scope: studentScope, items: stageStudentRoster(roster,
        previous.scope === studentScope ? previous.items : {}, savedStudentMarks, studentRosterContext, marks) }));
      return;
    }
    setDraft((prev) => {
      const next = { ...prev };
      for (const [id, status] of Object.entries(marks)) {
        if (!peopleById.has(id)) continue;
        if (existingByPerson.get(id)?.status === status) delete next[id];
        else next[id] = status;
      }
      return next;
    });
  }, [existingByPerson, kind, studentScope, roster, savedStudentMarks, studentRosterContext, peopleById]);

  const setStatus = useCallback((id: string, status: RosterStatus) => setStatuses({ [id]: status }), [setStatuses]);

  const stats = useMemo(() => {
    const s = { total: roster.length, present: 0, absent: 0, late: 0, unmarked: 0 };
    roster.forEach((p) => { s[getStatus(p.id)]++; });
    return s;
  }, [roster, getStatus]);

  const shiftDate = useCallback((days: number) => {
    setSelectedDate(shiftLocalISODate(selectedDate, days));
    setDraft({});
    setDetailDraft({});
    setStudentPending({ scope: '', items: {} });
  }, [selectedDate, setSelectedDate]);

  const goToDate = useCallback((v: string) => {
    setSelectedDate(v);
    setDraft({});
    setDetailDraft({});
    setStudentPending({ scope: '', items: {} });
  }, [setSelectedDate]);

  const markAllAs = useCallback((status: RosterStatus) => {
    if (kind === 'student') {
      setStudentPending(previous => ({ scope: studentScope, items: stageStudentRoster(roster,
        previous.scope === studentScope ? previous.items : {}, savedStudentMarks, studentRosterContext,
        Object.fromEntries(roster.map(person => [person.id, status]))) }));
      return;
    }
    setDraft((prev) => {
      const next = { ...prev };
      roster.forEach((p) => { next[p.id] = status; });
      return next;
    });
  }, [roster, kind, studentScope, savedStudentMarks, studentRosterContext]);

  const resetDraft = useCallback(() => { setDraft({}); setDetailDraft({}); setStudentPending({ scope: '', items: {} }); }, []);

  const handleSubmit = useCallback(async () => {
    if (kind === 'student' && !studentPayloads.length && !allSections && !studentContext?.sectionId) {
      toast.error(t('attendance.errors.selectSection'));
      return;
    }

    if (kind === 'student' && !studentPayloads.length && !allSections && attendanceMode === 'per_class' && (!studentContext?.teacherId || !studentContext?.subjectId || !studentContext?.teacherAssignmentId)) {
      toast.error(t('attendance.errors.selectTeacherSubject'));
      return;
    }

    if (kind === 'student' ? studentPayloads.length === 0 : changes.length === 0) {
      toast.info(t('attendance.roster.nothingToSave'));
      return;
    }

    const payloads = kind === 'student' ? studentPayloads : changes.map(({ person, status, existing }) => {
      const payload: any = {
        type: kind,
        [fkKey]: person.id,
        date: selectedDate,
        status,
      };
      if (existing) payload.id = existing.id;
      if (kind === 'staff') {
        const details = getDetails(person.id);
        payload.arrivalTime = details.arrivalTime || null;
        payload.notes = details.notes;
      }
      return payload;
    });

    if (kind === 'student') setStudentPending(previous => ({ scope: studentScope,
      items: { ...(previous.scope === studentScope ? previous.items : {}), ...Object.fromEntries(studentPayloads.map(item => [studentMarkKey(item), item])) } }));
    try {
      await onSubmitBatch(payloads);
      toast.success(t('attendance.roster.submitSuccess'));
      setDraft({});
      setDetailDraft({});
      if (kind === 'student') setStudentPending(previous => previous.scope === studentScope
        ? { ...previous, items: clearSubmittedStudentMarks(previous.items, studentPayloads) } : previous);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t('attendance.roster.submitError'));
    }
  }, [changes, kind, fkKey, selectedDate, onSubmitBatch, studentContext, attendanceMode, allSections, t, getDetails, studentPayloads, studentScope]);

  const submissionCount = kind === 'student' ? studentPayloads.length : changes.length;
  const hasChanges = submissionCount > 0;
  const isToday = selectedDate === today;
  const goToToday = useCallback(() => goToDate(today), [goToDate, today]);

  return {
    selectedDate,
    hasChanges,
    submissionCount,
    isToday,
    stats,
    getStatus,
    setStatus,
    setStatuses,
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
