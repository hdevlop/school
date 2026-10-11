import postgres from 'postgres';
import { spawn } from 'node:child_process';
const source = new URL(process.env.DB_URL);
if (!['localhost','127.0.0.1'].includes(source.hostname)) throw new Error('Local fixture only');
const target = new URL(source); target.pathname = '/school_landing_empty';
const env = {...process.env, DB_URL:target.toString(), REDIS_URL:'', NODE_ENV:'production', NAJM_NEXT_DIST_DIR:'.next-landing-build', NEXT_PUBLIC_APP_URL:'http://localhost:3105', NAJM_AUTH_INTERNAL_URL:'http://localhost:3105/api/auth/session/recover'};
const run = (args,cwd=process.cwd(),command='bun')=>new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd,env,stdio:'inherit'});child.on('exit',code=>code===0?resolve():reject(new Error(`Exit ${code}`)))});
if (process.argv.includes('--serve')) {
  env.NODE_ENV='development';env.NAJM_NEXT_DIST_DIR='.next-landing-empty';
  await run(['../../node_modules/next/dist/bin/next','dev','--turbo','-p','3105'],'apps/dashboard',process.execPath);
} else {
  const sql = postgres(source.toString());
  const existing = await sql`select datname from pg_database where datname='school_landing_empty'`;
  if (existing.length) throw new Error('Empty fixture already exists; do not overwrite');
  await sql.unsafe('CREATE DATABASE school_landing_empty'); await sql.end();
  await run(['run','db:migrate']);
}
