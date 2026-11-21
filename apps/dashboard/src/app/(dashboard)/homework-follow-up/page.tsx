import { redirect } from 'next/navigation';

export default function HomeworkFollowUpPage() {
  redirect('/homework?view=missed');
}
