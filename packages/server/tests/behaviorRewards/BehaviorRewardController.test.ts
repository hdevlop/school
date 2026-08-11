import { beforeAll, describe, expect, it } from 'bun:test';

describe('BehaviorRewardController contract', () => {
  let source = '';

  beforeAll(async () => {
    source = await Bun.file(
      new URL('../../src/modules/behaviorRewards/BehaviorRewardController.ts', import.meta.url),
    ).text();
  });

  it('exposes exactly the five core REST and MCP operations', () => {
    expect(source).toContain("@ToolGroup('behavior_rewards')");
    expect(source).toContain("@Controller('/behavior-rewards')");

    const methods = [...source.matchAll(/async (list|getById|create|update|delete)\(/g)]
      .map((match) => match[1]);

    expect(methods).toEqual(['list', 'getById', 'create', 'update', 'delete']);
    expect(source).not.toContain('deleteAll');
  });

  it('applies the matching permission guard to every operation', () => {
    expect(source).toMatch(/@Get\(\)[\s\S]*?@canListBehaviorRewards\(\)[\s\S]*?async list\(/);
    expect(source).toMatch(/@Get\('\/:id'\)[\s\S]*?@canReadBehaviorRewards\(\)[\s\S]*?async getById\(/);
    expect(source).toMatch(/@Post\(\)[\s\S]*?@canCreateBehaviorRewards\(\)[\s\S]*?async create\(/);
    expect(source).toMatch(/@Put\('\/:id'\)[\s\S]*?@canUpdateBehaviorRewards\(\)[\s\S]*?async update\(/);
    expect(source).toMatch(/@Delete\('\/:id'\)[\s\S]*?@canDeleteBehaviorRewards\(\)[\s\S]*?async delete\(/);
  });

  it('marks reads as read-only and mutations with confirmations', () => {
    expect(source.match(/readOnly: true/g)?.length).toBe(2);
    expect(source).toContain("confirm: { level: 'warning', message: 'confirm.behaviorRewards.create' }");
    expect(source).toContain("confirm: { level: 'warning', message: 'confirm.behaviorRewards.update' }");
    expect(source).toContain("destructive: true, confirm: { level: 'danger', message: 'confirm.behaviorRewards.delete' }");
  });
});
