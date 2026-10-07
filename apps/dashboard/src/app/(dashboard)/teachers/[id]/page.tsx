"use client";

import TeacherView from '@/features/Teachers/components/view/TeacherView';
import { useParams } from 'next/navigation';

export default function TeacherViewPage() {
  const params = useParams();
  const teacherId = params?.id as string;

  return <TeacherView teacherId={teacherId} />;
}
