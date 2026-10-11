import postgres from 'postgres';
import { spawn } from 'node:child_process';
const database='school_landing_demo';
const source=new URL(process.env.DB_URL);
if(!['localhost','127.0.0.1'].includes(source.hostname))throw new Error('Expected local development database');
const target=new URL(source);target.pathname=`/${database}`;
const env={...process.env,DB_URL:target.toString(),REDIS_URL:'',NODE_ENV:'development',ADMIN_EMAIL:'admin@landing.example.test',ADMIN_PASSWORD:'LandingDemo2026!',NAJM_NEXT_DIST_DIR:'.next-landing-qa',NAJM_AUTH_INTERNAL_URL:'http://localhost:3103/api/auth/session/recover',NEXT_PUBLIC_APP_URL:'http://localhost:3103',FRONTEND_URL:'http://localhost:3103'};
const run=(command,args,cwd=process.cwd())=>new Promise((resolve,reject)=>{const p=spawn(command,args,{cwd,env,stdio:'inherit'});p.on('exit',code=>code===0?resolve():reject(new Error(`${command} exited ${code}`)));});
if(process.argv.includes('--serve')){
  await run(process.execPath,['../../node_modules/next/dist/bin/next','dev','--turbo','-p','3103'],'apps/dashboard');
}else if(process.argv.includes('--production')){
  const cache = new URL(process.env.REDIS_URL);
  if(!['localhost','127.0.0.1'].includes(cache.hostname))throw new Error('Local Redis fixture only');
  cache.pathname='/13';env.REDIS_URL=cache.toString();
  env.NAJM_NEXT_DIST_DIR='.next-landing-build';
  env.NODE_ENV='production';
  env.NAJM_AUTH_INTERNAL_URL='http://localhost:3104/api/auth/session/recover';
  env.NEXT_PUBLIC_APP_URL='http://localhost:3104';
  env.FRONTEND_URL='http://localhost:3104';
  await run(process.execPath,['../../node_modules/next/dist/bin/next','start','-p','3104'],'apps/dashboard');
}else{
  const admin=postgres(source.toString());const existing=await admin`select datname from pg_database where datname=${database}`;
  if(existing.length)throw new Error('Demo database already exists; do not overwrite it');
  await admin.unsafe(`CREATE DATABASE ${database}`);await admin.end();
  await run('bun',['run','db:migrate']);
  await run('bun',['run','seed:admin']);
  await run('bun',['run','seed:demo','--year','2026-2027','--students','12','--teachers','4']);
}
