"use client"
import { StudentFeesView } from '@/features/Financial/Fees/components/StudentFeesView';
import { useParams, useSearchParams } from 'next/navigation';

export default function StudentFeesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = params.id as string;
  const feeId = searchParams.get('feeId');

  return <StudentFeesView studentId={studentId} initialFeeId={feeId} />;
}
