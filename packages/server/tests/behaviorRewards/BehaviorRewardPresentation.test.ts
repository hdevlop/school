import { describe, expect, it } from 'bun:test';

const dashboardFile = (path: string) => Bun.file(
  new URL(`../../../../apps/dashboard/src/features/BehaviorRewards/${path}`, import.meta.url),
).text();

describe('Behavior rewards dashboard contract', () => {
  it('refreshes the behavior reward query after successful mutations', async () => {
    const hook = await dashboardFile('hooks/useBehaviorRewards.tsx');
    const crud = await Bun.file(
      new URL('../../../../apps/dashboard/src/hooks/useEntityCRUD.tsx', import.meta.url),
    ).text();

    expect(hook).toContain("useEntityCRUD('behavior-rewards'");
    expect(crud.match(/invalidateAllEntities\(\);/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('renders translated tags instead of raw enum labels', async () => {
    const columns = await dashboardFile('hooks/useBehaviorRewardsTableColumns.tsx');
    expect(columns).toContain('behaviorRewards.categories.${row.original.category}');
    expect(columns).toContain('behaviorRewards.recognitionLevels.${value}');
    expect(columns).toContain('behaviorRewards.rewardTypes.${value}');
  });

  it('keeps all critical summary fields in the mobile card', async () => {
    const card = await dashboardFile('components/BehaviorRewardCard.tsx');
    for (const field of [
      'reward.student?.name', 'reward.student?.studentCode', 'reward.category',
      'reward.recognitionLevel', 'reward.rewardType', 'reward.points',
      'reward.class?.name', 'reward.section?.name', 'reward.behaviorAt',
    ]) {
      expect(card).toContain(field);
    }
  });
});
