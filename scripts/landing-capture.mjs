import { chromium } from 'playwright';
import sharp from 'sharp';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { mkdir } from 'node:fs/promises';
const base='http://localhost:3103';
const url=new URL(process.env.DB_URL);if(!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Local only');url.pathname='/school_landing_demo';
const sql=postgres(url.toString());
const [parent]=await sql`select u.id from users u join roles r on u.role_id=r.id where r.name='parent' order by (u.email='parent@landing.example.test') desc,u.id limit 1`;
await sql`update users set email='parent@landing.example.test',name='Salma Benali',password=${await bcrypt.hash('ParentDemo2026!',10)},status='active',email_verified=true where id=${parent.id}`;
await sql.end();
const browser=await chromium.launch({channel:'chrome',headless:true});
await mkdir('docs/evidence/landing',{recursive:true});
for(const [type,email,password,size] of [['dashboard','admin@landing.example.test','LandingDemo2026!',{width:1440,height:1000}],['parent','parent@landing.example.test','ParentDemo2026!',{width:390,height:780}]]){
  const context=await browser.newContext({viewport:size,deviceScaleFactor:2});
  await context.addCookies([{name:'school-ui-language',value:'en',url:base}]);
  const page=await context.newPage();await page.goto(`${base}/login`,{waitUntil:'networkidle',timeout:120000});
  await page.locator('input[name="identifier"]').fill(email);await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button',{name:'Login',exact:true}).click();
  await page.waitForURL(u=>!u.pathname.startsWith('/login'),{timeout:60000});
  await page.goto(`${base}${type==='dashboard'?'/dashboard':'/students'}`,{waitUntil:'networkidle',timeout:120000});
  await page.waitForTimeout(2000);
  await page.screenshot({path:`docs/evidence/landing/product-${type}.png`});
  await sharp(`docs/evidence/landing/product-${type}.png`).webp({quality:88}).toFile(`apps/dashboard/public/images/landing/product-${type}.webp`);
  if(page.url().includes('/login'))throw new Error('Product screenshot must be authenticated');
  console.log(type,page.url());await context.close();
}
await browser.close();
