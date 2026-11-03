import { describe, expect, it } from 'bun:test';
import { createDokploy, envValue, promote, selectRelease, waitUntilServing, withImage } from '../deploy-jhl.mjs';

const revision = 'a'.repeat(40);
const oldImage = `ghcr.io/hdevlop/school@sha256:${'1'.repeat(64)}`;
const newImage = `ghcr.io/hdevlop/school@sha256:${'2'.repeat(64)}`;
const release = { revision, image: newImage, buildRun: 'https://github.test/run' };
const env = `FRONTEND_URL=https://jhlschool.com\nJWT_ACCESS_SECRET=keep$&me\nSCHOOL_IMAGE=${oldImage}\nPOSTGRES_DB=school_jhl\n`;
const jhl = { name: 'jhl', sourceType: 'git', customGitBranch: 'main', composePath: './compose.production.yml', autoDeploy: false, env };

// One in-memory compose. `saves` decides what an update really stores, so a
// Dokploy that changes more than it was sent can be simulated.
function fakeDokploy(compose = jhl, saves = (current, body) => ({ ...current, ...body })) {
  const calls = [];
  let stored = compose;
  return {
    calls,
    get: async () => stored,
    post: async (path, body) => {
      calls.push({ path, body });
      if (path === 'compose.update') stored = saves(stored, body);
      return {};
    },
  };
}

const confirm = async () => {};
const run = (dokploy, overrides = {}) => promote({ dokploy, composeId: 'c1', release, servedRevision: 'b'.repeat(40), ask: confirm, log: () => {}, ...overrides });

describe('JHL environment edit', () => {
  it('changes only the image line', () => {
    expect(withImage(env, newImage)).toBe(env.replace(oldImage, newImage));
    expect(withImage(`A=1\r\nSCHOOL_IMAGE=${oldImage}\r\nB=2\r\n`, newImage)).toBe(`A=1\r\nSCHOOL_IMAGE=${newImage}\r\nB=2\r\n`);
  });

  it('keeps the quotes Dokploy stored around the image', () => {
    expect(withImage(`SCHOOL_IMAGE="${oldImage}"\nA=1\n`, newImage)).toBe(`SCHOOL_IMAGE="${newImage}"\nA=1\n`);
  });

  it('refuses a missing or repeated image line and a movable tag', () => {
    expect(() => withImage('A=1\n', newImage)).toThrow('found 0');
    expect(() => withImage(`SCHOOL_IMAGE=a\nSCHOOL_IMAGE=b\n`, newImage)).toThrow('found 2');
    expect(() => withImage(env, 'ghcr.io/hdevlop/school:demo')).toThrow('immutable');
  });

  it('reads plain and quoted values', () => {
    expect(envValue('X="https://a.test"\n', 'X')).toBe('https://a.test');
    expect(envValue('XY=1\nX=2\n', 'X')).toBe('2');
    expect(envValue(null, 'X')).toBeUndefined();
  });
});

describe('JHL promotion', () => {
  it('saves the image, then deploys', async () => {
    const dokploy = fakeDokploy();
    const result = await run(dokploy);
    expect(dokploy.calls.map(({ path }) => path)).toEqual(['compose.update', 'compose.deploy']);
    // Only env is sent, so Dokploy has nothing else to overwrite.
    expect(dokploy.calls[0].body).toEqual({ composeId: 'c1', env: withImage(env, newImage) });
    expect(result).toEqual({ previousImage: oldImage, deployed: true });
  });

  it('refuses any compose that is not JHL, before writing', async () => {
    const dokploy = fakeDokploy({ ...jhl, env: env.replace('jhlschool.com', 'myscolai.com') });
    await expect(run(dokploy)).rejects.toThrow('not JHL');
    expect(dokploy.calls).toEqual([]);
  });

  it('accepts the quoted values Dokploy stores', async () => {
    const dokploy = fakeDokploy({ ...jhl, env: `FRONTEND_URL="https://jhlschool.com"\nSCHOOL_IMAGE="${oldImage}"\n` });
    expect(await run(dokploy)).toEqual({ previousImage: oldImage, deployed: true });
  });

  it('refuses an environment Dokploy could not decrypt', async () => {
    const dokploy = fakeDokploy({ ...jhl, env: 'enc:v1:abc' });
    await expect(run(dokploy)).rejects.toThrow('still encrypted');
    expect(dokploy.calls).toEqual([]);
  });

  it('refuses while Auto Deploy is on', async () => {
    const dokploy = fakeDokploy({ ...jhl, autoDeploy: true });
    await expect(run(dokploy)).rejects.toThrow('Auto Deploy');
    expect(dokploy.calls).toEqual([]);
  });

  it('writes nothing on a dry run or a refused confirmation', async () => {
    const dry = fakeDokploy();
    expect((await run(dry, { dryRun: true })).deployed).toBe(false);
    expect(dry.calls).toEqual([]);

    const refused = fakeDokploy();
    const asked = [];
    const ask = async (_, expected) => {
      asked.push(expected);
      if (expected === 'deploy jhl') throw new Error('stopped');
    };
    await expect(run(refused, { ask })).rejects.toThrow('stopped');
    expect(asked).toEqual(['backup done', 'deploy jhl']);
    expect(refused.calls).toEqual([]);
  });

  it('does not deploy when Dokploy saved something else', async () => {
    const changedSource = fakeDokploy(jhl, (current, body) => ({ ...current, ...body, customGitBranch: null }));
    await expect(run(changedSource)).rejects.toThrow('customGitBranch');
    expect(changedSource.calls.map(({ path }) => path)).toEqual(['compose.update']);

    const lostEnv = fakeDokploy(jhl, (current) => current);
    await expect(run(lostEnv)).rejects.toThrow('env');
    expect(lostEnv.calls.map(({ path }) => path)).toEqual(['compose.update']);
  });

  it('refuses a revision already served, which could not be verified', async () => {
    const dokploy = fakeDokploy();
    await expect(run(dokploy, { servedRevision: revision })).rejects.toThrow('already serves');
    expect(dokploy.calls).toEqual([]);
  });

  it('redeploys without an update when the image is already selected', async () => {
    const dokploy = fakeDokploy({ ...jhl, env: withImage(env, newImage) });
    await run(dokploy);
    expect(dokploy.calls.map(({ path }) => path)).toEqual(['compose.deploy']);
  });
});

describe('release selection', () => {
  const fakeGh = (jobs) => (args) => (args[1] === 'list' ? JSON.stringify([{ databaseId: 7 }]) : JSON.stringify({ jobs }));
  const accepted = [{ name: 'Deploy and verify demo through Dokploy', conclusion: 'success' }];

  it('takes the image of a run that deployed the demo', () => {
    expect(selectRelease(revision, { gh: fakeGh(accepted), readRelease: () => release })).toBe(release);
  });

  it('refuses a published image the demo never ran', () => {
    const skipped = [{ name: 'Build and publish image', conclusion: 'success' }, { name: 'Deploy and verify demo through Dokploy', conclusion: 'skipped' }];
    expect(() => selectRelease(revision, { gh: fakeGh(skipped), readRelease: () => release })).toThrow('No workflow run');
  });

  it('refuses a record for another revision or a movable image', () => {
    expect(() => selectRelease(revision, { gh: fakeGh(accepted), readRelease: () => ({ ...release, revision: 'c'.repeat(40) }) })).toThrow('different revision');
    expect(() => selectRelease(revision, { gh: fakeGh(accepted), readRelease: () => ({ ...release, image: 'ghcr.io/hdevlop/school:demo' }) })).toThrow('immutable');
  });
});

describe('Dokploy client', () => {
  it('sends the key as a header and never over plain HTTP', async () => {
    expect(() => createDokploy('http://1.2.3.4:3000', 'secret')).toThrow('https');
    const seen = [];
    const client = createDokploy('https://dokploy.test', 'secret', async (url, init) => {
      seen.push({ url: String(url), key: init.headers['x-api-key'] });
      return new Response('{}');
    });
    await client.get('compose.one', { composeId: 'c1' });
    expect(seen).toEqual([{ url: 'https://dokploy.test/api/compose.one?composeId=c1', key: 'secret' }]);
  });

  it('keeps response bodies, which hold secrets, out of errors', async () => {
    const client = createDokploy('https://dokploy.test', 'secret', async () => new Response('JWT_ACCESS_SECRET=leak', { status: 500 }));
    const error = await client.post('compose.update', {}).catch((failure) => failure);
    expect(error.message).toBe('Dokploy compose.update returned 500');
  });
});

describe('serving check', () => {
  const site = (overrides = {}) => async (url) => {
    const { pathname, host } = new URL(url);
    if (host.startsWith('www.')) return new Response(null, { status: 308, headers: { location: 'https://jhlschool.com/login' } });
    if (pathname === '/deployment-revision.txt') return new Response(`${overrides.revision ?? revision}\n`);
    return new Response('', { status: overrides[pathname] ?? 200 });
  };
  const clock = () => {
    let time = 0;
    return { now: () => time, sleep: async (ms) => { time += ms; } };
  };

  it('passes when the revision, login, readiness and www redirect are right', async () => {
    const { www } = await waitUntilServing(revision, { fetchImpl: site(), ...clock() });
    expect(www).toBe('ok');
  });

  it('fails on the old revision or a failing readiness', async () => {
    await expect(waitUntilServing(revision, { fetchImpl: site({ revision: 'old' }), ...clock() })).rejects.toThrow('served old');
    await expect(waitUntilServing(revision, { fetchImpl: site({ '/api/health/status': 503 }), ...clock() })).rejects.toThrow('readiness 503');
  });
});
