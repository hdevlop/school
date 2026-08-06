"use client";

import StudentProfile from '@/features/Students/components/StudentProfile';
import { useParams } from 'next/navigation';

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params?.id as string;

  return <StudentProfile studentId={studentId} />;
}
