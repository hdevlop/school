import type { LucideIcon } from 'lucide-react';
import { NEmptyState } from 'najm-kit';

interface DashboardEmptyStateProps {
  icon: LucideIcon;
  title: string;
}

const DashboardEmptyState = ({ icon, title }: DashboardEmptyStateProps) => (
  <NEmptyState
    icon={icon}
    title={title}
    className="min-h-0 flex-1 py-4"
  />
);

export default DashboardEmptyState;
