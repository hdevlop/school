import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
const base = 'C:/Users/hdevlop/.codex/generated_images/01a12abc-fed1-7bb3-a153-5830357cbdc9/';
const files = { hero:'exec-99ec3286-2dca-4569-8701-1c88c289e9ca.png', assistant:'exec-4a7cfce9-2863-4c01-8f43-3a5450035c34.png',
  'program-default':'exec-9a33c62c-4315-4028-bfb3-93cb651ed496.png','program-1':'exec-2e5385e7-ecad-4fd4-8b99-d3c05833f96c.png','program-2':'exec-f494e63e-f3e2-4249-b6d4-13019e5be4ae.png','program-3':'exec-2788d230-4d2e-4dd8-a44f-d847f322917f.png' };
const dest = 'apps/dashboard/public/images/landing';
await mkdir(dest,{recursive:true});
for(const [name,file] of Object.entries(files)) await sharp(base+file).resize({width:name==='hero'?1440:1000,withoutEnlargement:true}).webp({quality:84}).toFile(`${dest}/${name}.webp`);
await sharp(base+files.hero).resize(1200,630,{fit:'cover'}).webp({quality:85}).toFile(`${dest}/og.webp`);
await writeFile(`${dest}/zellige.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="600"><defs><pattern id="z" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M20 0 25 10 35 5 30 15 40 20 30 25 35 35 25 30 20 40 15 30 5 35 10 25 0 20 10 15 5 5 15 10Z" fill="none" stroke="#9494bd" stroke-opacity=".16" stroke-width=".8"/></pattern></defs><path fill="url(#z)" d="M0 0h300v600H0z"/></svg>`);
