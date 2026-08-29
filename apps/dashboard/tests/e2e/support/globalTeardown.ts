import { removeFixtureUsers } from './acceptance';

/**
 * The suite's fixture identities are the only rows it writes, and they are
 * removed once at the end of the run rather than per spec file — the files
 * share a worker and each one recreates what it needs on the way in.
 */
export default async function globalTeardown() {
  await removeFixtureUsers();
}
