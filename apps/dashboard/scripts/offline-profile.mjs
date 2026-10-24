import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';

// WebKit for Windows stores each cached response body 196 characters below
// the profile (CacheStorage/<40 hex>/Version 16/Records/<40 hex>/<uuid>/<40 hex>-blob)
// and cannot write past MAX_PATH. A longer profile name made the worker's
// precache fail with "Failed writing data to the file system", so WebKit
// profiles get a short name and the path budget is checked up front.
const WEBKIT_BODY_PATH = 196;
const WINDOWS_MAX_PATH = 259;

export async function createOfflineProfile(root, prefix, engine) {
  await mkdir(root, { recursive: true });
  const profile = await mkdtemp(resolve(root, engine === 'webkit' ? 'wk-' : prefix));
  if (engine === 'webkit' && process.platform === 'win32' && profile.length + 1 + WEBKIT_BODY_PATH > WINDOWS_MAX_PATH) {
    throw new Error(`WebKit cannot store cached files under ${profile}: move the checkout to a shorter path.`);
  }
  return profile;
}
