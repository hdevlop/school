import{expect,test}from'bun:test';
import{mkdtempSync,writeFileSync,readFileSync}from'node:fs';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{wordingV5Protocol}from'../chatbot-jev-wording-v5.mjs';

test('classification-only CLI stops after a missing-cost response and preserves its reserve',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'jev-wording-v5-cli-'));
  const plan=join(dir,'plan.json'),out=join(dir,'run.json'),audit=join(dir,'audit.json'),preload=join(dir,'fetch.mjs');
  writeFileSync(plan,JSON.stringify(wordingV5Protocol()));
  writeFileSync(preload,`import{writeFileSync}from'node:fs';let calls=0;globalThis.fetch=async(url,init)=>{
    if(String(url)!=='https://openrouter.ai/api/alpha/decisions')throw Error('Unexpected transport');
    calls++;writeFileSync(process.env.WORDING_TEST_AUDIT,JSON.stringify({calls,deny:JSON.parse(init.body).provider.data_collection,redirect:init.redirect}));
    return Response.json({model:'typesafe/jev-1.13',usage:{input_tokens:1},answers:{}});};`);
  const child=Bun.spawn([process.execPath,'--preload='+preload,'scripts/chatbot-jev-wording-v5.mjs','--execute','--plan='+plan,
    '--output='+out,'--max-requests=96','--max-estimated-usd=0.02'],{env:{...process.env,
      OPENROUTER_API_KEY:'private-synthetic-test-key',WORDING_TEST_AUDIT:audit},stdout:'pipe',stderr:'pipe'});
  await new Response(child.stdout).text();const stderr=await new Response(child.stderr).text();
  expect(await child.exited,stderr).toBe(0);
  const report=JSON.parse(readFileSync(out,'utf8'));
  expect(report.status).toBe('stopped');expect(report.actualProviderRequests).toBe(1);
  expect(report.rows[0].costUsd).toBeNull();expect(report.budget.reservedUsd).toBe(.00015);
  expect(report.budget.requestsWithUnknownCost).toBe(1);expect(report.analysis.developmentGatePassed).toBe(false);
  expect(JSON.parse(readFileSync(audit,'utf8'))).toEqual({calls:1,deny:'deny',redirect:'error'});
  expect(JSON.stringify(report)).not.toContain('private-synthetic-test-key');
});
