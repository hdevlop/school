"use client";

import { TeacherProfile } from '@/features/Teachers/components/profile';
import { useParams } from 'next/navigation';

export default function TeacherProfilePage() {
  const params = useParams();
  const teacherId = params?.id as string;

  return <TeacherProfile teacherId={teacherId} />;
}
