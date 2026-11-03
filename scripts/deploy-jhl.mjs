import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';

// Promotes an image the demo already accepted to the JHL installation, from the
// operator's terminal. It builds nothing: CI remains the only image publisher.
// The Dokploy key stays on this machine; GitHub still holds no customer
// credential. See docs/deployment/demo-and-customer.md.
const ORIGIN = 'https://jhlschool.com';
const WWW_ORIGIN = 'https://www.jhlschool.com';
const IMAGE = /^ghcr\.io\/hdevlop\/school@sha256:[0-9a-f]{64}$/;
const WORKFLOW = 'deploy-production.yml';
const DEMO_JOB = 'Deploy and verify demo through Dokploy';
const MIGRATIONS = 'packages/server/src/database/migrations';
const SOURCE_REF = { git: 'customGitBranch', github: 'branch', gitlab: 'gitlabBranch', bitbucket: 'bitbucketBranch', gitea: 'giteaBranch' };
// Everything a deployment takes from Dokploy besides env. An update that moves
// one of these stops the release before it deploys.
const PRESERVED = ['name', 'appName', 'sourceType', 'composeType', 'composePath', 'composeFile', 'autoDeploy', ...Object.values(SOURCE_REF)];
const SERVING_TIMEOUT_MS = 15 * 60 * 1000;

export function envValue(env, key) {
  const line = (env ?? '').split(/\r?\n/).find((entry) => entry.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
}

// Returns the same text with only the image line changed: every other line is a
// secret or an installation value this script has no business rewriting.
export function withImage(env, image) {
  if (!IMAGE.test(image)) throw new Error('Refusing an image that is not an immutable School digest');
  const lines = (env ?? '').match(/^SCHOOL_IMAGE=/gm) ?? [];
  if (lines.length !== 1) throw new Error(`Expected one SCHOOL_IMAGE line in the JHL environment, found ${lines.length}`);
  return env.replace(/^SCHOOL_IMAGE=(["']?)[^\r\n]*/m, (_, quote) => `SCHOOL_IMAGE=${quote}${image}${quote}`);
}

// The API key opens every project on this Dokploy, the demo included, so the
// target has to prove it is JHL before anything is written.
export function assertCustomerCompose(compose) {
  // Dokploy encrypts env at rest and returns the stored text when it cannot decrypt it.
  if (compose.env?.startsWith('enc:')) throw new Error('Dokploy returned the JHL environment still encrypted; nothing can be read or edited safely');
  if (envValue(compose.env, 'FRONTEND_URL') !== ORIGIN) throw new Error(`This Dokploy compose is not JHL: FRONTEND_URL is not ${ORIGIN}`);
  if (compose.autoDeploy !== false) throw new Error('JHL must keep Auto Deploy off; turn it off in Dokploy first');
}

export function createDokploy(baseUrl, apiKey, fetchImpl = fetch) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:') throw new Error('DOKPLOY_URL must use https: the API key must not cross the network in plain text');
  const request = async (path, init) => {
    const response = await fetchImpl(new URL(`/api/${path}`, base), {
      ...init,
      headers: { accept: 'application/json', 'content-type': 'application/json', 'x-api-key': apiKey },
    });
    // The body is not printed: compose responses carry the installation's secrets.
    if (!response.ok) throw new Error(`Dokploy ${path.split('?')[0]} returned ${response.status}`);
    return response.json();
  };
  return {
    get: (path, query) => request(`${path}?${new URLSearchParams(query)}`, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  };
}

// Publication alone is not acceptance: a paused demo publishes an image and
// still ends in success, with its deploy job skipped.
export function selectRelease(revision, { gh, readRelease }) {
  const runs = JSON.parse(gh(['run', 'list', '--workflow', WORKFLOW, '--commit', revision, '--status', 'success', '--limit', '20', '--json', 'databaseId']));
  const accepted = runs.find(({ databaseId }) => {
    const { jobs } = JSON.parse(gh(['run', 'view', String(databaseId), '--json', 'jobs']));
    return jobs.some((job) => job.name === DEMO_JOB && job.conclusion === 'success');
  });
  if (!accepted) throw new Error(`No workflow run deployed ${revision} to the demo successfully`);
  const release = readRelease(accepted.databaseId, `school-release-${revision}`);
  if (release.revision !== revision) throw new Error('The release record names a different revision');
  if (!IMAGE.test(release.image)) throw new Error('The release record does not name an immutable School digest');
  return release;
}

function sourceRef(compose) {
  const field = SOURCE_REF[compose.sourceType];
  return field ? compose[field] : undefined;
}

// Writes nothing until the operator has confirmed the backup and the release.
export async function promote({ dokploy, composeId, release, servedRevision, ask, log, dryRun = false, describeRelease = () => [] }) {
  const compose = await dokploy.get('compose.one', { composeId });
  assertCustomerCompose(compose);
  if (servedRevision === release.revision) throw new Error(`${ORIGIN} already serves ${release.revision}; a redeploy of the same image cannot be verified here, use Dokploy`);
  const previousImage = envValue(compose.env, 'SCHOOL_IMAGE');
  const env = withImage(compose.env, release.image);

  log(`Dokploy compose:  ${compose.name}`);
  log(`Compose source:   ${compose.sourceType} ${sourceRef(compose) ?? '(inline)'} ${compose.composePath ?? ''}`);
  log(`Served revision:  ${servedRevision ?? 'unavailable'}`);
  log(`Current image:    ${previousImage}`);
  log(`Selected image:   ${release.image}`);
  log(`Selected commit:  ${release.revision}`);
  for (const line of describeRelease(compose)) log(line);
  if (dryRun) {
    log('Dry run: nothing was changed.');
    return { previousImage, deployed: false };
  }

  await ask('Is a restorable off-server backup of the JHL database and uploads done?', 'backup done');
  await ask('Set this image on JHL and deploy it?', 'deploy jhl');

  if (env !== compose.env) {
    await dokploy.post('compose.update', { composeId, env });
    const saved = await dokploy.get('compose.one', { composeId });
    const moved = PRESERVED.filter((field) => saved[field] !== compose[field]);
    if (saved.env !== env || moved.length > 0) {
      throw new Error(`Dokploy did not save only the image (${moved.join(', ') || 'env'}); nothing was deployed. Review the JHL project, previous image: ${previousImage}`);
    }
  }
  await dokploy.post('compose.deploy', { composeId, title: `Promote ${release.revision.slice(0, 12)}`, description: release.buildRun ?? '' });
  return { previousImage, deployed: true };
}

async function status(fetchImpl, url) {
  try {
    return (await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(20_000) })).status;
  } catch {
    return 0;
  }
}

export async function readServedRevision(fetchImpl = fetch, cacheKey = Date.now()) {
  try {
    const response = await fetchImpl(`${ORIGIN}/deployment-revision.txt?revision=${cacheKey}`, { signal: AbortSignal.timeout(10_000) });
    return response.ok ? (await response.text()).trim() : undefined;
  } catch {
    return undefined;
  }
}

// Dokploy answers once the job is queued, so success is what the public site
// serves. The revision proves the web service only, never the worker.
export async function waitUntilServing(revision, { fetchImpl = fetch, sleep = Bun.sleep, now = Date.now, timeoutMs = SERVING_TIMEOUT_MS } = {}) {
  const deadline = now() + timeoutMs;
  let last = { revision: undefined, login: 0, readiness: 0, www: 'unchecked' };
  while (now() < deadline) {
    last = { ...last, revision: await readServedRevision(fetchImpl, revision) };
    if (last.revision === revision) {
      last.login = await status(fetchImpl, `${ORIGIN}/login`);
      last.readiness = await status(fetchImpl, `${ORIGIN}/api/health/status`);
      last.www = await wwwRedirect(fetchImpl);
      if (last.login === 200 && last.readiness === 200 && last.www === 'ok') return last;
    }
    await sleep(10_000);
  }
  throw new Error(`JHL did not become ready: served ${last.revision ?? 'unavailable'}, login ${last.login}, readiness ${last.readiness}, www ${last.www}`);
}

async function wwwRedirect(fetchImpl) {
  try {
    const response = await fetchImpl(`${WWW_ORIGIN}/login`, { redirect: 'manual', signal: AbortSignal.timeout(20_000) });
    const location = response.headers.get('location');
    const redirected = response.status >= 300 && response.status < 400 && location && new URL(location, WWW_ORIGIN).href === `${ORIGIN}/login`;
    return redirected ? 'ok' : `status ${response.status}`;
  } catch {
    return 'unreachable';
  }
}

function runTool(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}

function gh(args) {
  const result = runTool('gh', args);
  if (result.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function readRelease(runId, artifact) {
  const directory = mkdtempSync(join(tmpdir(), 'school-release-'));
  try {
    gh(['run', 'download', String(runId), '--name', artifact, '--dir', directory]);
    return JSON.parse(readFileSync(join(directory, 'release.json'), 'utf8'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// What the docs ask an operator to review before promoting, read from local Git.
// Unknown is reported as unknown: never as "no migrations" or "compatible".
function describeReleaseFromGit(release, servedRevision) {
  return (compose) => {
    const lines = [];
    const commitKnown = servedRevision && runTool('git', ['cat-file', '-e', `${servedRevision}^{commit}`]).status === 0;
    if (!commitKnown) {
      lines.push('Pending migrations: UNKNOWN, review them by hand (served revision not available locally)');
    } else {
      if (runTool('git', ['merge-base', '--is-ancestor', servedRevision, release.revision]).status !== 0) {
        lines.push('WARNING: the selected commit does not descend from the served one. A rollback restores code, not schema.');
      }
      const added = runTool('git', ['diff', '--name-only', '--diff-filter=A', servedRevision, release.revision, '--', MIGRATIONS]).stdout.trim();
      lines.push(added ? `Pending migrations (they run automatically on deploy):\n  ${added.split('\n').join('\n  ')}` : 'Pending migrations: none');
    }
    const ref = sourceRef(compose);
    const path = compose.composePath?.replace(/^\.\//, '');
    // Dokploy checks this ref out when it deploys, so compare what GitHub has now.
    const fetched = ref && path && runTool('git', ['fetch', '--quiet', 'origin', ref]).status === 0;
    const compared = fetched ? runTool('git', ['diff', '--quiet', release.revision, `origin/${ref}`, '--', path]).status : undefined;
    if (compared === 0) lines.push(`Compose file: ${path} on origin/${ref} matches the selected commit`);
    else if (compared === 1) lines.push(`WARNING: ${path} on origin/${ref} differs from the selected commit. Review compatibility before deploying.`);
    else lines.push('Compose file: UNKNOWN, could not compare it with the selected commit. Review compatibility before deploying.');
    return lines;
  };
}

function resolveCommit(commit) {
  const result = runTool('git', ['rev-parse', '--verify', `${commit}^{commit}`]);
  if (result.status !== 0) throw new Error(`Unknown commit: ${commit}. Run git fetch if it is new.`);
  return result.stdout.trim();
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in apps/dashboard/.env.local`);
  return value;
}

async function main(argv) {
  const dryRun = argv.includes('--dry-run');
  const positional = argv.filter((argument) => !argument.startsWith('--'));
  // The operator's own decision to answer both questions in advance, backup included.
  const confirmed = argv.includes('--yes');
  if (positional.length !== 1) throw new Error('Usage: bun run deploy:jhl <commit> [--dry-run] [--yes]');
  if (!dryRun && !confirmed && !process.stdin.isTTY) throw new Error('A real deploy needs an interactive terminal or --yes; use --dry-run to only preview');

  const dokploy = createDokploy(requireEnv('DOKPLOY_URL'), requireEnv('DOKPLOY_API_KEY'));
  const composeId = requireEnv('DOKPLOY_JHL_COMPOSE_ID');
  const revision = resolveCommit(positional[0]);
  const release = selectRelease(revision, { gh, readRelease });
  const servedRevision = await readServedRevision();

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const ask = async (question, expected) => {
      if (confirmed) {
        console.log(`${question} Answered "${expected}" by --yes.`);
        return;
      }
      const answer = await prompt.question(`${question} Type "${expected}" to continue: `);
      if (answer.trim() !== expected) throw new Error('Stopped by the operator; nothing was deployed');
    };
    const { previousImage, deployed } = await promote({
      dokploy, composeId, release, servedRevision, ask, dryRun, log: console.log,
      describeRelease: describeReleaseFromGit(release, servedRevision),
    });
    if (!deployed) return;
    console.log('Deployment queued. Waiting for JHL to serve it (up to 15 minutes)...');
    try {
      await waitUntilServing(revision);
    } catch (error) {
      console.error(`Previous image, if you decide to go back: ${previousImage}`);
      console.error('Going back restores code, not schema. Check the deployment logs in Dokploy first.');
      throw error;
    }
    console.log(`JHL serves ${revision}; login, readiness and the www redirect pass.`);
    console.log('Still yours to check: the worker image and heartbeat, an essential school workflow, and mail delivery.');
  } finally {
    prompt.close();
  }
}

if (import.meta.main) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
