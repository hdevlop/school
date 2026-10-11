import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
const base='http://localhost:3103';const output='docs/evidence/landing';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
for(const language of ['en','fr','ar','es'])for(const width of [390,768,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme});
  await context.addCookies([{name:'school-ui-language',value:language,url:base},{name:'school-ui-theme',value:theme,url:base}]);
  const page=await context.newPage();const failures=[];const errors=[];const external=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)(response.url().startsWith(base)?failures:external).push(`${response.status()} ${response.url()}`)});
  page.on('console',message=>{if(message.type()==='error' && !message.text().includes('google'))errors.push(`${message.text()} ${message.location().url}`)});
  await page.goto(`${base}/welcome`,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForTimeout(800);
  await page.locator('.landing').evaluate(async el=>{for(let y=0;y<el.scrollHeight;y+=800){el.scrollTop=y;await new Promise(r=>setTimeout(r,70));}el.scrollTop=0;});
  await page.locator('.landing-photo img,.landing-devices img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));
  await page.waitForFunction(()=>[...document.querySelectorAll('.landing-photo img,.landing-devices img')].every(img=>img.complete && img.naturalWidth>0),{},{timeout:60000});
  await page.locator('iframe').evaluateAll(frames=>frames.forEach(frame=>frame.loading='eager'));
  await page.waitForTimeout(1200);
  const state=await page.evaluate(()=>({language:document.documentElement.lang,direction:document.documentElement.dir,themeApplied:document.documentElement.classList.contains('dark')?'dark':'light',h1:document.querySelectorAll('h1').length,
    overflow:document.querySelector('.landing').scrollWidth>innerWidth,images:[...document.querySelectorAll('.landing-photo img,.landing-devices img')].filter(img=>!img.complete||img.naturalWidth===0).map(img=>img.getAttribute('alt')),
    rawKeys:/\b(?:landing|visitRequests)\.[a-zA-Z]/.test(document.querySelector('main').innerText),viewport:document.querySelector('meta[name="viewport"]').content,
  }));
  const record={language,width,theme,...state,failures,errors,external};results.push(record);
  if(width===1440||width===390){await page.locator('.landing').evaluate(el=>{el.scrollTop=0;el.style.height=`${el.scrollHeight}px`;el.style.overflow='visible'});await page.screenshot({path:`${output}/${language}-${width}-${theme}.png`,fullPage:true});}
  console.log(JSON.stringify({language,width,theme,overflow:state.overflow,images:state.images.length,failures:failures.length,errors:errors.length}));await context.close();
}
await writeFile(`${output}/browser-results.json`,JSON.stringify({matrix:results},null,2)+'\n');
const context=await browser.newContext();const page=await context.newPage();const requests=[];page.on('request',r=>{if(r.method()==='POST')requests.push(new URL(r.url()).pathname)});
await page.goto(`${base}/welcome`);await page.getByRole('button',{name:'Change language'}).click();await page.getByText('AR · العربية',{exact:true}).click();
await page.waitForFunction(()=>document.documentElement.lang==='ar');await page.reload();
const languageSwitch={language:await page.locator('html').getAttribute('lang'),cookie:(await context.cookies()).find(c=>c.name==='school-ui-language')?.value,requests};
await page.locator('.landing-skip').focus();await page.keyboard.press('Enter');const skipFocus=await page.evaluate(()=>document.activeElement?.id);
await writeFile(`${output}/browser-results.json`,JSON.stringify({matrix:results,languageSwitch,skipFocus},null,2)+'\n');
await browser.close();
await sharp('docs/design/landing-page-reference.png').resize({width:720}).toFile(`${output}/reference-scaled.png`);
await sharp(`${output}/en-1440-light.png`).resize({width:720}).toFile(`${output}/result-scaled.png`);
const a=await sharp(`${output}/reference-scaled.png`).metadata();const b=await sharp(`${output}/result-scaled.png`).metadata();
await sharp({create:{width:1460,height:Math.max(a.height,b.height),channels:3,background:'#eee'}}).composite([{input:`${output}/reference-scaled.png`,left:0,top:0},{input:`${output}/result-scaled.png`,left:740,top:0}]).webp({quality:85}).toFile(`${output}/reference-comparison.webp`);
if(results.some(r=>r.overflow||r.images.length||r.failures.length||r.errors.length||r.rawKeys||r.h1!==1)||languageSwitch.language!=='ar'||languageSwitch.cookie!=='ar'||requests.some(p=>p.startsWith('/api/users/lang'))||skipFocus!=='landing-main')process.exitCode=1;
