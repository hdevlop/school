import { describe, expect, test } from 'bun:test';
import { timedRead } from '@/lib/timedRead';

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('timedRead', () => {
  test('returns the value and stays silent for a quick read', async () => {
    const logged: string[] = [];
    expect(await timedRead('quick', async () => 'value', (message) => logged.push(message))).toBe('value');
    expect(logged).toEqual([]);
  });

  test('names a slow read and how long it took', async () => {
    const logged: string[] = [];
    await timedRead('settings', () => pause(520), (message) => logged.push(message));
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatch(/settings took \d+ ms/);
  });

  test('a failed read still fails, and a slow failure is logged too', async () => {
    const logged: string[] = [];
    const failing = timedRead('settings', async () => { await pause(520); throw new Error('unavailable'); }, (message) => logged.push(message));
    let failure: unknown;
    await failing.catch((error) => { failure = error; });
    expect((failure as Error).message).toBe('unavailable');
    expect(logged).toHaveLength(1);
  });
});
