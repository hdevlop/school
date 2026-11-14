'use client';
import { useEffect, useState } from 'react';
import type { SelectedStudent } from '../components/MassarPaper';

/**
 * The students picked on the sheet, kept with their class: another class has no such students.
 *
 * A click picks one student; Ctrl/⌘ + click adds one, or takes it off again. A click outside the
 * sheet, or Escape, lets them go. Elements marked `data-keep-selection` (Print, the subject tabs)
 * keep them: they are how the picked students' statements are reached. Escape closing a menu or
 * dialog closes only that.
 */
export function useStudentPicking(className: string) {
  const [picked, setPicked] = useState<{ className: string; students: SelectedStudent[] } | null>(null);
  const pickedHere = picked?.className === className ? picked.students : [];
  const hasPicked = pickedHere.length > 0;

  useEffect(() => {
    if (!hasPicked) return;
    const outside = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest?.('table[data-pick], [data-keep-selection]')) setPicked(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[role="menu"], [role="dialog"]')) setPicked(null);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [hasPicked]);

  const pickStudent = (student: SelectedStudent, toggle: boolean) => {
    const already = pickedHere.some(item => item.id === student.id);
    const students = !toggle ? [student] : already ? pickedHere.filter(item => item.id !== student.id) : [...pickedHere, student];
    setPicked({ className, students });
  };

  return { pickedHere, pickStudent };
}
