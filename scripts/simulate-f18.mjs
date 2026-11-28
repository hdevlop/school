#!/usr/bin/env node
/**
 * Pretends to be a ZKTeco F18 fingerprint terminal, so the staff attendance
 * flow can be tried without one. It sends the same plain-text ADMS requests
 * the device sends to /iclock.
 *
 *   bun run f18 connect                      the device's opening request
 *   bun run f18 scan 101                     user 101 scans now
 *   bun run f18 scan 101 08:20               user 101 scanned today at 08:20
 *   bun run f18 scan 101 08:20 2026-11-28    … on that day
 *   bun run f18 users 101="Ahmed Alaoui" 102=Sara   the names typed on the device
 *   bun run f18 poll                         the half-minute poll; closes a finished day
 *
 * The serial must be listed in ATTENDANCE_DEVICE_SERIALS in
 * apps/dashboard/.env.local (default TESTF18). F18_URL picks the server
 * (default http://localhost:3102) and F18_SERIAL the serial.
 */

const BASE = (process.env.F18_URL || 'http://localhost:3102').replace(/\/$/u, '');
const SERIAL = process.env.F18_SERIAL || 'TESTF18';

const pad = (value) => String(value).padStart(2, '0');
const now = new Date();
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

function usage(message) {
  if (message) console.error(`${message}\n`);
  console.error('Usage: bun run f18 <connect | scan <id> [HH:MM] [YYYY-MM-DD] | users <id>=<name>... | poll>');
  process.exit(1);
}

async function send(path, body) {
  const url = `${BASE}/iclock/${path}${path.includes('?') ? '&' : '?'}SN=${encodeURIComponent(SERIAL)}`;
  let response;
  try {
    response = await fetch(url, body === undefined
      ? {}
      : { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body });
  } catch (error) {
    console.error(`Cannot reach ${BASE}. Is \`bun run dev\` running? (${error.message})`);
    process.exit(1);
  }
  const text = await response.text();
  if (!response.ok) {
    console.error(`${response.status} ${text}`);
    if (response.status === 403) console.error(`Add ATTENDANCE_DEVICE_SERIALS=${SERIAL} to apps/dashboard/.env.local and restart the dev server.`);
    process.exit(1);
  }
  return text;
}

const [command, ...args] = process.argv.slice(2);

if (command === 'connect') {
  console.log(await send('cdata?options=all&pushver=2.4.1'));
} else if (command === 'scan') {
  const [id, time = clock, date = today] = args;
  if (!/^[A-Za-z0-9]{1,24}$/u.test(id ?? '')) usage('scan needs the user ID on the device, e.g. scan 101');
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/u.test(time)) usage(`"${time}" is not a time like 08:20`);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) usage(`"${date}" is not a date like ${today}`);
  const [hours, minutes, seconds = '00'] = time.split(':');
  const stamp = `${date} ${pad(hours)}:${minutes}:${seconds}`;
  // The device makes sure the server knows it before uploading.
  await send('cdata?options=all');
  console.log(`user ${id} scanned at ${stamp}: ${await send('cdata?table=ATTLOG&Stamp=1', `${id}\t${stamp}\t0\t1\t0\t0\n`)}`);
} else if (command === 'users') {
  const users = args.map((pair) => {
    const at = pair.indexOf('=');
    if (at < 1) usage(`"${pair}" is not id=name`);
    return { id: pair.slice(0, at), name: pair.slice(at + 1) };
  });
  if (!users.length) usage('users needs at least one id=name');
  await send('cdata?options=all');
  const body = users.map((user) => `USER PIN=${user.id}\tName=${user.name}\tPri=0\tPasswd=\tCard=\tGrp=1`).join('\n');
  console.log(`sent ${users.length} user(s): ${await send('cdata?table=OPERLOG&Stamp=1', `${body}\n`)}`);
} else if (command === 'poll') {
  console.log(`poll: ${await send('getrequest')}`);
} else {
  usage(command ? `Unknown command "${command}"` : undefined);
}
