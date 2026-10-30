import { describe, expect, it } from 'bun:test';
import { avatarVersion } from '@/lib/avatarVersion';

describe('avatar versions', () => {
  const updatedAt = '2026-10-30 00:58:19.90376';

  it('stamps an uploaded picture with its owner update time', () => {
    expect(avatarVersion('a1b2c3.webp', updatedAt)).toBe(updatedAt);
    expect(avatarVersion('/api/files/serve/a1b2c3.webp', updatedAt)).toBe(updatedAt);
  });

  it('leaves a bundled default unstamped so every card shares one cached file', () => {
    expect(avatarVersion('/images/student_female.png', updatedAt)).toBeUndefined();
    expect(avatarVersion(' /images/parent_male.png ', updatedAt)).toBeUndefined();
  });

  it('has nothing to stamp without a picture or an update time', () => {
    expect(avatarVersion(undefined, updatedAt)).toBeUndefined();
    expect(avatarVersion('  ', updatedAt)).toBeUndefined();
    expect(avatarVersion('a1b2c3.webp', null)).toBeUndefined();
  });
});
