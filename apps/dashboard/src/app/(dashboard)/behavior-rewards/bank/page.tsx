import RewardTemplatesTable from '@/features/RewardTemplates/components/RewardTemplatesTable';

// The server layouts check the shared page rules; the API also enforces the
// reward-templates permissions for every action inside this table.
export default function RewardTemplatesPage() {
  return <RewardTemplatesTable />;
}
