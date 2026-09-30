import BehaviorRewardsTable from '@/features/BehaviorRewards/components/BehaviorRewardsTable';

// No role list here: the sidebar shows this page by `read:behavior-rewards`,
// the list route refuses anyone else, and the table draws that refusal as
// "access denied". A client redirect used to decide instead, from a copy of the
// role names, and such redirects race the session check on a full page load
// (see `settings/layout.tsx`).
export default function BehaviorRewardsPage() {
  return <BehaviorRewardsTable />;
}
