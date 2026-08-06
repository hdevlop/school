"use client";

import { ParentProfile } from '@/features/Parents/components/profile';
import { useParams } from 'next/navigation';

export default function ParentProfilePage() {
  const params = useParams();
  const parentId = params?.id as string;

  return <ParentProfile parentId={parentId} />;
}
