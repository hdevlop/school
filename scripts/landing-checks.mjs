import { spawn } from 'node:child_process';
import { createWriteStream, writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('docs/evidence/landing',{recursive:true});
const commands=process.argv.slice(2);const results=[];
for(const command of commands){
  const log=createWriteStream(`docs/evidence/landing/${command.replaceAll(':','-')}.log`);
  const env={...process.env,NAJM_NEXT_DIST_DIR:'.next-landing-build'};
  const child=spawn('bun',['run',command],{env});child.stdout.pipe(log);child.stderr.pipe(log);
  const code=await new Promise(resolve=>child.on('exit',resolve));log.end();
  results.push({command,exitCode:code});console.log(JSON.stringify(results.at(-1)));
}
writeFileSync('docs/evidence/landing/check-results.json',JSON.stringify(results,null,2)+'\n');
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
