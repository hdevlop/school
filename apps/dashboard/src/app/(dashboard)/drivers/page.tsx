import { redirect } from 'next/navigation';

// Drivers are managed from the unified Staff roster (see STAFF_ROLES_REFACTOR_PLAN.md §8).
export default function Drivers() {
  redirect('/staff');
}
