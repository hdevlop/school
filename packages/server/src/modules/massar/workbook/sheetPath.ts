import { strFromU8 } from 'fflate';
/** Sheet ids are not file numbers: Massar uses sheetId=2 for sheet1.xml. */
export function sheetPath(files: Record<string, Uint8Array>, name: string) {
  const workbook = files['xl/workbook.xml'], relationships = files['xl/_rels/workbook.xml.rels'];
  if (!workbook || !relationships) return undefined;
  const sheet = [...strFromU8(workbook).matchAll(/<(?:\w+:)?sheet\b[^>]*>/g)].find(match => match[0].includes(`name="${name}"`))?.[0];
  const id = sheet && /\br:id="([^"]+)"/.exec(sheet)?.[1];
  const rel = [...strFromU8(relationships).matchAll(/<(?:\w+:)?Relationship\b[^>]*>/g)].find(match => /\bId="([^"]+)"/.exec(match[0])?.[1] === id)?.[0];
  const target = rel && /\bTarget="([^"]+)"/.exec(rel)?.[1];
  return target ? target.startsWith('/') ? target.slice(1) : `xl/${target}` : undefined;
}
