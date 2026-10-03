import { lookup } from 'node:dns/promises';
import { Agent } from 'node:https';
import { BlockList, isIP } from 'node:net';

export class InvalidPushEndpoint extends Error {}

// FIX: SEC-004 — only browser push services may receive encrypted notifications.
export function isSupportedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password || url.hash) return false;
    const host = url.hostname;
    return ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].includes(host)
      || /^[a-z0-9-]+\.notify\.windows\.com$/.test(host);
  } catch {
    return false;
  }
}

const nonPublic = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) nonPublic.addSubnet(address, prefix, 'ipv4');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
nonPublic.addSubnet('2001::', 23, 'ipv6');
nonPublic.addSubnet('2001:db8::', 32, 'ipv6');
nonPublic.addSubnet('2002::', 16, 'ipv6'); // No IPv4 tunnelling destinations.
nonPublic.addSubnet('3fff::', 20, 'ipv6'); // Documentation addresses.

export function isPublicPushAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !nonPublic.check(address, 'ipv4');
  if (family === 6) return globalV6.check(address, 'ipv6') && !nonPublic.check(address, 'ipv6');
  return false;
}

type ResolveAddresses = (host: string) => Promise<Array<{ address: string; family: number }>>;

export async function createSafePushAgent(endpoint: string, resolve: ResolveAddresses = (host) => lookup(host, { all: true, verbatim: true })): Promise<Agent> {
  if (!isSupportedPushEndpoint(endpoint)) throw new InvalidPushEndpoint('Unsupported push endpoint');
  const host = new URL(endpoint).hostname;
  const addresses = await resolve(host);
  if (!addresses.length || addresses.some(({ address, family }) => isIP(address) !== family || !isPublicPushAddress(address))) {
    throw new InvalidPushEndpoint('Push endpoint resolved to a non-public address');
  }
  // Pin the checked DNS results into the actual TLS connection lookup. TLS
  // still verifies the provider hostname; no second DNS lookup can rebind it.
  return new Agent({
    keepAlive: false,
    lookup: (hostname, options, callback) => {
      if (hostname !== host) return callback(new InvalidPushEndpoint('Unexpected push hostname'), '', 0);
      const candidates = options.family ? addresses.filter((item) => item.family === options.family) : addresses;
      if (!candidates.length) return callback(new InvalidPushEndpoint('Unsupported push address family'), '', 0);
      if (options.all) callback(null, candidates);
      else callback(null, candidates[0].address, candidates[0].family);
    },
  });
}
