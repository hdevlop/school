import { spawn } from 'node:child_process';
const url = new URL(process.env.SCHOOL_HISTORY_TEST_DB_URL);
if (!['localhost','127.0.0.1'].includes(url.hostname) || url.pathname !== '/school_history_test') throw new Error('Expected isolated history fixture');
const run = (args, env) => new Promise((resolve,reject) => { const child=spawn('bun',args,{env:{...process.env,...env},stdio:'inherit'});child.on('exit',code=>code===0?resolve():reject(new Error(`Exit ${code}`))); });
await run(['run','db:migrate'],{ DB_URL: url.toString() });
await run(['run','test:security:transport'],{});
