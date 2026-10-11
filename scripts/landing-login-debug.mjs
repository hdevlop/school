import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext();const page=await context.newPage();
const requests=[];const errors=[];page.on('response',r=>requests.push([r.status(),new URL(r.url()).pathname]));page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:3103/login');await page.locator('input[name="identifier"]').fill('admin@landing.example.test');await page.locator('input[name="password"]').fill('LandingDemo2026!');await page.getByRole('button',{name:'Login',exact:true}).click();await page.waitForTimeout(5000);
console.log(JSON.stringify({url:page.url(),cookies:(await context.cookies()).map(c=>({name:c.name,secure:c.secure,domain:c.domain})),requests,errors,body:(await page.locator('body').innerText()).slice(0,700)}));await browser.close();
