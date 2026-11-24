import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { getRoutes } from 'najm-core';
import { getGuardMetadata } from 'najm-guard';
import { RewardTemplateController } from '../../src/modules/rewardTemplates/RewardTemplateController';
import { createRewardTemplateDto, updateRewardTemplateDto } from '../../src/modules/rewardTemplates/RewardTemplateDto';
import { RewardTemplateValidator } from '../../src/modules/rewardTemplates/RewardTemplateValidator';
import rolePermissions from '../../src/modules/seed-data/admin/rolePermissions.json';
import rewardTemplatesData from '../../src/modules/seed-data/school/rewardTemplates.json';
import { BEHAVIOR_REWARD_CATEGORY_VALUES } from '@sms/contracts';
import { withEnglishMessages } from '../support/englishMessages';

const RESOURCE_ACTIONS = ['read', 'create', 'update', 'delete'].map((action) => `${action}:reward-templates`);

function byPermission(controller: any) {
  const result: Record<string, string[]> = {};
  for (const { methodName } of getRoutes(controller)) {
    const chain = getGuardMetadata(controller, methodName).map((guard: any) => [guard.guardClass?.name, guard.params ?? null]);
    const key = chain.find(([name]) => name === 'PermissionGuard')?.[1] ?? JSON.stringify(chain);
    (result[key] ??= []).push(methodName);
  }
  for (const list of Object.values(result)) list.sort();
  return result;
}

const grants = (role: string) => rolePermissions.find((entry) => entry.roleName === role)?.permissions ?? [];

describe('the reward bank', () => {
  it('asks a reward-templates permission on every route', () => {
    expect(byPermission(RewardTemplateController)).toEqual({
      'read:reward-templates': ['getById', 'list'],
      'create:reward-templates': ['create'],
      'update:reward-templates': ['update'],
      'delete:reward-templates': ['delete'],
    });
  });

  it('lets every role that records rewards read the bank, and the principal curate it', () => {
    for (const entry of rolePermissions) {
      if (entry.permissions.includes('create:behavior-rewards')) expect(entry.permissions, entry.roleName).toContain('read:reward-templates');
    }
    expect(grants('principal')).toEqual(expect.arrayContaining(RESOURCE_ACTIONS));
    for (const role of ['teacher', 'monitor', 'supervisor', 'parent', 'student']) {
      expect(grants(role).filter((name) => name.endsWith(':reward-templates') && !name.startsWith('read:')), role).toEqual([]);
    }
    for (const role of ['parent', 'student']) expect(grants(role), role).not.toContain('read:reward-templates');
  });

  it('declares its permissions, and grants them to existing roles on deploy', () => {
    const catalog = JSON.parse(readFileSync(new URL('../../src/modules/seed-data/admin/permissions.json', import.meta.url), 'utf8'));
    for (const name of RESOURCE_ACTIONS) expect(catalog.map((entry: { name: string }) => entry.name)).toContain(name);
    const migration = readFileSync(new URL('../../src/database/migrations/0143_behavior_reward_templates.sql', import.meta.url), 'utf8');
    for (const name of RESOURCE_ACTIONS) expect(migration).toContain(`'${name}'`);
  });

  it('accepts what a recorded reward accepts', () => {
    const valid = { title: 'Outstanding teamwork', category: 'teamwork', rewardType: 'badge', points: 10 };
    expect(createRewardTemplateDto.parse({ ...valid, points: undefined }).points).toBe(0);
    for (const points of [-1, 101, 2.5]) expect(createRewardTemplateDto.safeParse({ ...valid, points }).success).toBe(false);
    expect(createRewardTemplateDto.safeParse({ ...valid, title: ' ' }).success).toBe(false);
    expect(createRewardTemplateDto.safeParse({ ...valid, category: 'bribery' }).success).toBe(false);
    expect(updateRewardTemplateDto.safeParse({ active: false }).success).toBe(true);
  });

  it('ships a starter bank the API accepts, one name per category and reward type, covering every category', () => {
    const keys = new Set<string>();
    for (const entry of rewardTemplatesData) {
      expect(createRewardTemplateDto.safeParse(entry).success, entry.title).toBe(true);
      const key = `${entry.category}/${entry.rewardType}/${entry.title.toLowerCase()}`;
      expect(keys.has(key), key).toBe(false);
      keys.add(key);
    }
    expect(new Set(rewardTemplatesData.map((entry) => entry.category))).toEqual(new Set(BEHAVIOR_REWARD_CATEGORY_VALUES));
  });

  it('refuses a second template with the same name for the same category and reward type', async () => {
    const repository = { findDuplicate: async (title: string) => (title.toLowerCase() === 'team spirit' ? { id: 'x' } : null) };
    const validator = withEnglishMessages(new RewardTemplateValidator(repository as any));
    await expect(validator.ensureTitleUnique('Team Spirit', 'teamwork', 'badge')).rejects.toThrow();
    await expect(validator.ensureTitleUnique('Kindness', 'teamwork', 'badge')).resolves.toBeUndefined();
  });
});
