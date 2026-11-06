/** Local one-time fixture builder. Never copies personal values into the fixture.
 * bun packages/server/tests/massar/createSyntheticTemplate.ts <clean-export.xlsx>
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
const source = process.argv[2];
if (!source) throw new Error('Pass a local clean export; no source path is stored');
const files = unzipSync(new Uint8Array(await Bun.file(source).arrayBuffer()));
const safeValues: Record<string, string | number> = {
  C5: 'SYNTHETIC-SCHOOL', E5: '00000000-0000-4000-8000-000000000000', G5: 1, I5: 1, K5: '#0011#', M5: 19, O5: 1061101010,
  D7: 'Synthetic academy', I7: 'Synthetic direction', O7: 'Synthetic school', D9: 'Synthetic primary level', I9: '1APG-1',
  D11: 'الدورة الأولى', I11: 'الفرض الأول', O11: 'Synthetic subject', D13: '2026/2027',
  G15: '#1001#', G16: 'الخط ', H16: 'الخط ', G17: 'النقطة', H17: 'التغيب',
};
// Preserve the clean XML prefix and formatting, erase EVERY cell value, and
// restore only this explicit synthetic allowlist. There are no shared strings.
for (const path of Object.keys(files)) {
  if (/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) {
    let xml = strFromU8(files[path]);
    xml = xml.replace(/<x:c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/x:c>)/g, (_all, attributes: string) => {
      const address = /\br="([^"]+)"/.exec(attributes)?.[1] ?? '';
      const safe = path === 'xl/worksheets/sheet1.xml' ? safeValues[address] : address === 'A1' ? ' ' : address === 'A2' ? 'مبرر' : undefined;
      const attrs = attributes.replace(/\s+t="[^"]*"/g, '');
      return safe === undefined ? `<x:c${attrs}/>` : `<x:c${attrs} t="${typeof safe === 'number' ? 'n' : 'str'}"><x:v>${safe}</x:v></x:c>`;
    }).replace(/(?:hashValue|saltValue)="[^"]*"/g, attribute => attribute.startsWith('hash') ? 'hashValue="AAAAAAAAAAAAAAAAAAAAAA=="' : 'saltValue="AAAAAAAAAAAAAAAAAAAAAA=="');
    files[path] = strToU8(xml);
  } else if (path === 'xl/workbook.xml') {
    files[path] = strToU8(strFromU8(files[path]).replace(/(?:workbookHashValue|workbookSaltValue|revisionsHashValue|revisionsSaltValue)="[^"]*"/g, attribute => `${attribute.split('=')[0]}="AAAAAAAAAAAAAAAAAAAAAA=="`));
  } else if (path === 'xl/sharedStrings.xml') {
    files[path] = strToU8('<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>');
  } else if (path === 'docProps/core.xml') {
    files[path] = strToU8('<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"/>');
  }
}
await Bun.write(new URL('./fixtures/synthetic.xlsx', import.meta.url), zipSync(files));
