import { describe, expect, it } from 'bun:test';
import { Xlsx } from 'xlsx-manager';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readExport, unpack, type MassarExport } from '../../src/modules/massar/workbook/readExport';
import { writeSheet } from '../../src/modules/massar/workbook/writeSheet';
import { sheetPath } from '../../src/modules/massar/workbook/sheetPath';
import { strFromU8, strToU8, zipSync } from 'fflate';
export const template = new Uint8Array(readFileSync(new URL('./fixtures/synthetic.xlsx', import.meta.url)));
export async function syntheticExport(components = 6, students = 3): Promise<MassarExport> {
  const base = await readExport(template);
  return { ...base, components: Array.from({ length: components }, (_, i) => ({ code: String(1001 + i), name: i === 0 ? 'الخط ' : i === 1 ? 'الإستماع والتحدث\n' : `Synthetic component ${i + 1}` })),
    students: Array.from({ length: students }, (_, i) => ({ massarStudentId: `synthetic-${i + 1}`, studentCode: `SYNTHETIC${i + 1}`, name: `Synthetic student ${i + 1}`, dateOfBirth: '01-01-2018', marks: [] })) };
}
describe('Massar workbook', () => {
  it('commits only a synthetic empty template with placeholder identifiers and protection', async () => {
    const data = await readExport(template);
    expect(data.clean).toBe(true); expect(data.students).toEqual([]); expect(data.schoolCode).toBe('SYNTHETIC-SCHOOL');
    expect(data.classGuid).toBe('00000000-0000-4000-8000-000000000000');
    for (const [name, value] of Object.entries(unpack(template))) if (name.includes('sheet') && name.endsWith('.xml')) {
      const xml = new TextDecoder().decode(value);
      for (const match of xml.matchAll(/(?:hashValue|saltValue)="([^"]+)"/g)) expect(match[1]).toBe('AAAAAAAAAAAAAAAAAAAAAA==');
    }
  });
  for (const components of [1, 6, 9, 13]) it(`round-trips ${components} component pairs and exact names`, async () => {
    const input = await syntheticExport(components, 33), result = await readExport(await writeSheet(template, input));
    expect(result.components).toEqual(input.components); expect(result.students).toEqual(input.students.map(student => ({ ...student, marks: input.components.map(component => ({ componentCode: component.code, mark: null, absence: 'none' })) })));
    for (const key of ['schoolCode', 'classGuid', 'yearId', 'levelCode', 'term', 'exam', 'levelLabel', 'subjectName'] as const) expect(result[key]).toEqual(input[key]);
  }, 30000);
  for (const students of [1, 33]) it(`limits decimal and absence validation to ${students} students`, async () => {
    const data = await syntheticExport(2, students), bytes = await writeSheet(template, data), xlsx = new Xlsx();
    await xlsx.loadBuffer(bytes); xlsx.useSheet('NotesCC');
    expect(xlsx.getCell('G18')!.dataValidation).toMatchObject({ type: 'decimal', formulae: [0, 10], allowBlank: true });
    expect(xlsx.getCell('H18')!.dataValidation).toMatchObject({ type: 'list', formulae: ['Data!$A$1:$A$2'] });
    expect(xlsx.getCell(17 + students, 7).dataValidation.type).toBe('decimal');
    expect(xlsx.getCell(18 + students, 7).dataValidation?.type).toBeUndefined();
    expect(xlsx.getCell(18 + students, 3).value).toBeNull();
    xlsx.useSheet('Data'); expect(xlsx.worksheet.state).toBe('hidden'); expect(xlsx.getCell('A1')!.value).toBe(' '); expect(xlsx.getCell('A2')!.value).toBe('مبرر');
  }, 30000);
  it('round-trips zero, decimals, justified absences and text collège level codes', async () => {
    const data = await syntheticExport(1, 3);
    Object.assign(data, { className: '1APIC-1', level: '1APIC', kind: 'exam', maxMark: 20, levelCode: '2A31101110', components: [{ code: '1', name: 'الفرض الأول' }] });
    data.students[0].marks = [{ componentCode: '1', mark: 0, absence: 'none' }];
    data.students[1].marks = [{ componentCode: '1', mark: 19.75, absence: 'none' }];
    data.students[2].marks = [{ componentCode: '1', mark: null, absence: 'justified' }];
    const bytes = await writeSheet(template, data), result = await readExport(bytes);
    expect(result.levelCode).toBe('2A31101110'); expect(result.kind).toBe('exam'); expect(result.maxMark).toBe(20); expect(result.students).toEqual(data.students);
    const xlsx = new Xlsx(); await xlsx.loadBuffer(bytes); xlsx.useSheet('NotesCC'); expect(xlsx.getCell('G18')!.dataValidation.formulae).toEqual([0, 20]);
  }, 30000);
  it('clears template students, marks, components and stale validations for shorter sheets', async () => {
    const longer = await syntheticExport(13, 33); longer.students[0].marks = [{ componentCode: '1001', mark: 10, absence: 'none' }];
    const dirty = await writeSheet(template, longer), shorter = await syntheticExport(1, 1), bytes = await writeSheet(dirty, shorter, true);
    const result = await readExport(bytes); expect(result.students).toHaveLength(1); expect(result.components).toHaveLength(1); expect(result.students[0].marks[0].mark).toBeNull();
    const xlsx = new Xlsx(); await xlsx.loadBuffer(bytes); xlsx.useSheet('NotesCC'); expect(xlsx.getCell('AE15')!.value).toBeNull(); expect(xlsx.getCell('AE18')!.dataValidation?.type).toBeUndefined();
  }, 30000);
  it('preserves merges, protection, hidden dimensions, print area and styling', async () => {
    const data = await syntheticExport(), bytes = await writeSheet(template, data), before = await structure(template), after = await structure(bytes);
    for (const key of ['merges','protection','printArea','conditionalFormattings','columns','rows'] as const) expect(after[key]).toEqual(before[key]);
    for (const [index, style] of before.styles.entries()) expect(after.styles[index], `style at cell ${index}`).toEqual(style);
  }, 30000);
  it('refuses invalid mark/absence combinations, zip bombs, invalid workbooks and encryption', async () => {
    const data = await syntheticExport(); data.students[0].marks = [{ componentCode: data.components[0].code, mark: 5, absence: 'justified' }];
    await expect(writeSheet(template, data)).rejects.toMatchObject({ key: 'invalidMark' });
    expect(() => unpack(template, 100)).toThrow('tooLarge');
    await expect(readExport(new Uint8Array([0xd0, 0xcf, 1]))).rejects.toMatchObject({ key: 'encrypted' });
    await expect(readExport(new Uint8Array([1, 2, 3]))).rejects.toMatchObject({ key: 'invalidWorkbook' });
  });
  it('bounds sparse rows and columns before scanning the roster', async () => {
    for (const [row, column] of [[1000000, 'C'], [15, 'AJ']] as const) {
      const files = unpack(template), path = sheetPath(files, 'NotesCC')!;
      files[path] = strToU8(strFromU8(files[path]).replace('</x:sheetData>', `<x:row r="${row}"><x:c r="${column}${row}" t="str"><x:v>Synthetic value</x:v></x:c></x:row></x:sheetData>`));
      await expect(readExport(zipSync(files))).rejects.toMatchObject({ key: 'tooLarge' });
    }
  });
  it('explains edited workbooks with unsupported dimensions without calling them oversized uploads', async () => {
    const files = unpack(await writeSheet(template, await syntheticExport())), path = sheetPath(files, 'NotesCC')!;
    files[path] = strToU8(strFromU8(files[path]).replace('</sheetData>', '<row r="1000000"><c r="C1000000" t="str"><v>Synthetic value</v></c></row></sheetData>'));
    await expect(readExport(zipSync(files))).rejects.toMatchObject({ key: 'unsupportedLayout' });
  });
  it('reads a collège whole-term export as one round per test, leaving teacher notes aside', async () => {
    const data = await readExport(await syntheticTermExport());
    expect([data.exam, data.examLabel, data.kind, data.maxMark]).toEqual([0, '', 'exam', 20]);
    expect(data.termRounds).toEqual(TERM_COLUMNS.slice(0, 5).map(([code, name]) => ({ exam: Number(code), examLabel: name, components: [{ code, name }] })));
    // The first test stands for the file elsewhere, exactly as its single-test export would.
    expect(data.components).toEqual([{ code: '1', name: 'الفرض الأول' }]);
    // Every test's marks, coded with the test's number: the import fills each test's grid from them.
    expect(data.students[0].marks).toEqual(TERM_COLUMNS.slice(0, 5).map(([code]) => ({ componentCode: code, mark: code === '1' ? 18 : null, absence: 'none' })));
  }, 30000);
  it('checks every test of a whole-term export, and still refuses a primary export without its test', async () => {
    await expect(readExport(await syntheticTermExport(xlsx => { xlsx.getCell('I18')!.value = 25; }))).rejects.toMatchObject({ key: 'invalidMark' });
    await expect(readExport(await syntheticTermExport(xlsx => { xlsx.getCell('I15')!.value = '#12#'; }))).rejects.toMatchObject({ key: 'invalidComponents' });
    await expect(readExport(await syntheticTermExport(xlsx => { xlsx.getCell('I11')!.value = 'الفرض الأول'; }))).rejects.toMatchObject({ key: 'invalidHeader' });
    const primary = new Xlsx(); await primary.loadBuffer(await writeSheet(template, await syntheticExport(2, 1))); primary.useSheet('NotesCC');
    primary.getCell('I5')!.value = 0; primary.getCell('I11')!.value = null;
    await expect(readExport(new Uint8Array(await primary.writeBuffer()))).rejects.toMatchObject({ key: 'invalidHeader' });
  }, 30000);
  it('treats relationship identifiers as literal data', () => {
    expect(sheetPath({ 'xl/workbook.xml': strToU8('<workbook><sheets><sheet name="NotesCC" r:id="("/></sheets></workbook>'), 'xl/_rels/workbook.xml.rels': strToU8('<Relationships><Relationship Id="(" Target="worksheets/sheet1.xml"/></Relationships>') }, 'NotesCC')).toBe('xl/worksheets/sheet1.xml');
  });
});
// A collège whole-term export's columns, in Massar's order: the fourth test is #5#, integrated activities #4#.
const TERM_COLUMNS = [['1', 'الفرض الأول'], ['2', 'الفرض الثاني'], ['3', 'الفرض الثالث'], ['5', 'الفرض الرابع'], ['4', 'الأنشطة المندمجة'], ['100', 'ملاحظات الأستاذ']] as const;
async function syntheticTermExport(edit?: (xlsx: Xlsx) => void) {
  const data = await syntheticExport(1, 2);
  Object.assign(data, { className: '1APIC-1', level: '1APIC', kind: 'exam', maxMark: 20, levelCode: '2A31101110', components: TERM_COLUMNS.map(([code, name]) => ({ code, name })) });
  data.students[0].marks = [{ componentCode: '1', mark: 18, absence: 'none' }];
  const xlsx = new Xlsx(); await xlsx.loadBuffer(await writeSheet(template, data)); xlsx.useSheet('NotesCC');
  xlsx.getCell('I5')!.value = 0; xlsx.getCell('I11')!.value = null;
  // Teacher notes (column Q) carry no mark: "-" instead of النقطة, and free text per student.
  xlsx.getCell('Q17')!.value = '-'; xlsx.getCell('Q18')!.value = 'Synthetic note';
  edit?.(xlsx);
  return new Uint8Array(await xlsx.writeBuffer());
}
async function structure(bytes: Uint8Array) {
  const xlsx = new Xlsx(); await xlsx.loadBuffer(bytes); xlsx.useSheet('NotesCC');
  // ExcelJS alone drops Massar's dxf borders on read; xlsx-manager restores them.
  await xlsx.reapplyRules();
  const sheet = xlsx.worksheet, model = sheet.model as typeof sheet.model & { sheetProtection?: unknown; conditionalFormattings?: unknown; cols?: unknown; rows?: Array<{ number: number; hidden?: boolean; height?: number }> };
  const styles: unknown[] = [];
  for (let row = 1; row <= 204; row++) for (let col = 1; col <= 35; col++) { const cell = sheet.getCell(row, col); styles.push([cell.address, effectiveStyle(cell.style)]); }
  return { merges: model.merges?.toSorted(), protection: model.sheetProtection, printArea: sheet.pageSetup.printArea,
    conditionalFormattings: model.conditionalFormattings, columns: model.cols, rows: model.rows?.map(row => [row.number, row.hidden, row.height]), styles };
}
function effectiveStyle(style: object) {
  // An omitted style is Excel's normal style, equivalent to explicit xf=0.
  return { font: { name: 'Calibri', size: 11, color: { theme: 1 }, family: 2, scheme: 'minor' }, fill: { type: 'pattern', pattern: 'none' }, border: {}, ...style };
}
async function loadGoldenSamples(sampleDirectory?: string) {
  if (!sampleDirectory) return [];
  const paths: string[] = [];
  const walk = (dir: string) => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) walk(path); else if (/\.xlsx$/i.test(entry.name)) paths.push(path); } };
  walk(sampleDirectory);
  const samples: Array<{ bytes: Uint8Array; data: MassarExport }> = [];
  for (const path of paths) {
    const bytes = new Uint8Array(readFileSync(path));
    let zip: Record<string, Uint8Array>;
    try { zip = unpack(bytes); } catch { continue; }
    const sheet = sheetPath(zip, 'NotesCC');
    if (!sheet || !/<x:worksheet\b/.test(new TextDecoder().decode(zip[sheet]))) continue;
    // Generated sheets hold one test: a whole-term export is read, never regenerated.
    const data = await readExport(bytes);
    if (!data.termRounds) samples.push({ bytes, data });
  }
  return samples;
}
const samples = await loadGoldenSamples(process.env.MASSAR_SAMPLES);
it.skipIf(samples.length < 2)('local golden: regenerates every clean real export from another template', async () => {
  for (const [index, sample] of samples.entries()) {
    const result = await writeSheet(samples[(index + 1) % samples.length].bytes, sample.data);
    const parsed = await readExport(result); expect({ ...parsed, clean: false }).toEqual({ ...sample.data, clean: false });
    const reference = new Xlsx(), generated = new Xlsx(); await reference.loadBuffer(sample.bytes); await generated.loadBuffer(result); reference.useSheet('NotesCC'); generated.useSheet('NotesCC');
    for (let row = 1; row <= 204; row++) for (let col = 1; col <= 35; col++) {
      const a = reference.getCell(row, col), b = generated.getCell(row, col);
      expect([b.value, b.type, effectiveStyle(b.style), b.dataValidation], `sample ${index}, cell ${row}:${col}`).toEqual([a.value, a.type, effectiveStyle(a.style), a.dataValidation]);
    }
    expect(await structure(result)).toEqual(await structure(sample.bytes));
  }
}, 180000);
