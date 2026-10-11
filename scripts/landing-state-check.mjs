import { chromium } from 'playwright';
import postgres from 'postgres';
import { writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch({channel:'chrome',headless:true});
const results = {};
const demo = 'http://localhost:3103';
const target = new URL(process.env.DB_URL);
if (!['localhost','127.0.0.1'].includes(target.hostname)) throw new Error('Local fixture only');
target.pathname='/school_landing_demo';
const sql = postgres(target.toString());
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();
page.setDefaultNavigationTimeout(120000);
try {
  const empty = await page.goto('http://localhost:3105/welcome',{waitUntil:'networkidle'});
  results.empty = {status:empty.status(),name:await page.locator('.landing-brand').first().innerText(),map:await page.locator('iframe').count(),programs:await page.locator('#programs').count(),stats:await page.locator('.landing-stats').count(),testimonials:await page.locator('.landing-testimonials').count(),form:await page.locator('form').count()};
  if (results.empty.status!==200 || results.empty.map || results.empty.programs || results.empty.stats || results.empty.testimonials || !results.empty.name.includes('MyScolAI')) throw new Error('Fresh installation must have no invented content');
  await page.locator('.landing-photo img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));
  await page.screenshot({path:'docs/evidence/landing/empty-install.png'});
  await page.goto(`${demo}/welcome`,{waitUntil:'networkidle'});
  results.canonical=await page.locator('link[rel=canonical]').getAttribute('href');
  results.jsonLdNonce=await page.locator('script[type="application/ld+json"]').evaluate(el=>Boolean(el.nonce));
  results.languageAlternates=await page.locator('link[hreflang]').count();
  const sitemap=await page.request.get(`${demo}/sitemap.xml`);
  results.sitemap=await sitemap.text();
  await sql`update school_landing set published=false where id='school'`;
  results.unpublished=(await page.goto(`${demo}/welcome`)).status();
  results.unpublishedSitemap=await (await page.request.get(`${demo}/sitemap.xml`)).text();
  if(results.unpublished!==404 || results.unpublishedSitemap.includes('/welcome'))throw new Error('Unpublished content must not be indexed');
  await sql`update school_landing set published=true where id='school'`;
  await page.goto(`${demo}/welcome`,{waitUntil:'networkidle'});
  const imageHeight=await page.locator('.landing-hero-visual').evaluate(el=>el.getBoundingClientRect().height);
  const failed=await browser.newContext({viewport:{width:1440,height:1000}});
  let failedImages=0;
  await failed.route('**/_next/image?*',route=>{
    if(new URL(route.request().url()).searchParams.get('url').endsWith('/hero.webp')){failedImages++;return route.fulfill({status:404,body:'Image unavailable'});}
    return route.continue();
  });
  const brokenPage=await failed.newPage();await brokenPage.goto(`${demo}/welcome`,{waitUntil:'networkidle'});
  await brokenPage.locator('.landing-hero .landing-photo-placeholder').waitFor();
  results.imageFallback={attempts:failedImages,height:await brokenPage.locator('.landing-hero-visual').evaluate(el=>el.getBoundingClientRect().height),expectedHeight:imageHeight};
  await failed.close();
  if(failedImages>2 || results.imageFallback.height!==imageHeight)throw new Error('Fallback must be stable and bounded');
  const welcomeManifest=await readFile('apps/dashboard/.next-landing-build/server/app/(public)/welcome/page_client-reference-manifest.js','utf8');
  const loginManifest=await readFile('apps/dashboard/.next-landing-build/server/app/(auth)/login/page_client-reference-manifest.js','utf8');
  const chunks=text=>new Set([...text.matchAll(/static\/chunks\/[^"\\]+\.js/g)].map(match=>match[0]));
  const welcome=chunks(welcomeManifest);const shared=chunks(loginManifest);
  results.landingClientGzip=0;results.landingClientFiles=[];
  for(const file of welcome)if(!shared.has(file)){results.landingClientFiles.push(file);results.landingClientGzip+=gzipSync(await readFile(`apps/dashboard/.next-landing-build/${file}`)).length;}
  await writeFile('docs/evidence/landing/state-results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
} finally {
  await sql`update school_landing set published=true where id='school'`;
  await sql.end();await browser.close();
}
