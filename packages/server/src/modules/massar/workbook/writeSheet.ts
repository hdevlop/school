import { Xlsx } from 'xlsx-manager';
import { strFromU8, strToU8, zipSync } from 'fflate';
import { isValidMassarMark } from '@sms/contracts';
import { FIRST_COMPONENT_COLUMN, FIRST_STUDENT_ROW, MASSAR_CELLS, MAX_COMPONENTS, MAX_STUDENTS, columnName } from './cells';
import { MassarWorkbookError, unpack, type MassarExport } from './readExport';
import { sheetPath } from './sheetPath';

export async function writeSheet(template: Uint8Array, data: MassarExport, empty = false): Promise<Uint8Array> {
  const original = unpack(template);
  if (!data.components.length || data.components.length > MAX_COMPONENTS || data.students.length > MAX_STUDENTS) throw new MassarWorkbookError('tooLarge');
  const xlsx = new Xlsx();
  await xlsx.loadBuffer(template);
  xlsx.useSheet('NotesCC');
  for (const [key, address] of Object.entries(MASSAR_CELLS)) xlsx.getCell(address)!.value = data[key as keyof typeof MASSAR_CELLS];
  xlsx.getCell('K5')!.value = `#${data.subjectCode}#`;
  // Only values change: leave the official styles, merges, hidden columns,
  // conditional formatting, protection, row dimensions and print area intact.
  for (let row = 15; row <= Math.max(xlsx.worksheet.rowCount, FIRST_STUDENT_ROW + data.students.length - 1); row++) {
    for (let col = row < FIRST_STUDENT_ROW ? FIRST_COMPONENT_COLUMN : 2; col <= FIRST_COMPONENT_COLUMN + MAX_COMPONENTS * 2 - 1; col++) {
      const cell = xlsx.worksheet.findCell(row, col);
      if (cell && (!cell.isMerged || cell.master.address === cell.address)) cell.value = null;
    }
  }
  xlsx.clearValidation();
  data.components.forEach((component, index) => {
    const col = FIRST_COMPONENT_COLUMN + index * 2;
    xlsx.getCell(15, col).value = `#${component.code}#`;
    for (let offset = 0; offset < 2; offset++) {
      xlsx.getCell(16, col + offset).value = component.name;
      xlsx.getCell(17, col + offset).value = offset ? 'التغيب' : 'النقطة';
    }
    if (data.students.length) {
      const end = FIRST_STUDENT_ROW + data.students.length - 1;
      xlsx.setValidation(`${columnName(col)}18:${columnName(col)}${end}`, { type: 'decimal', allowBlank: true, showInputMessage: true, showErrorMessage: true, formulae: [0, data.maxMark] });
      xlsx.setValidation(`${columnName(col + 1)}18:${columnName(col + 1)}${end}`, { type: 'list', allowBlank: true, showInputMessage: true, showErrorMessage: true, formulae: ['Data!$A$1:$A$2'] });
    }
  });
  data.students.forEach((student, index) => {
    const row = FIRST_STUDENT_ROW + index;
    [student.massarStudentId, student.studentCode, student.name, null, student.dateOfBirth].forEach((value, offset) => {
      if (offset !== 3) xlsx.getCell(row, 2 + offset).value = value;
    });
    if (!empty) data.components.forEach((component, i) => {
      const mark = student.marks.find(mark => mark.componentCode === component.code);
      if (!mark) return;
      if (!isValidMassarMark(mark.mark, mark.absence, data.maxMark)) throw new MassarWorkbookError('invalidMark');
      xlsx.getCell(row, FIRST_COMPONENT_COLUMN + i * 2).value = mark.mark;
      if (mark.absence === 'justified') xlsx.getCell(row, FIRST_COMPONENT_COLUMN + i * 2 + 1).value = 'مبرر';
    });
  });
  xlsx.useSheet('Data');
  xlsx.getCell('A1')!.value = ' ';
  xlsx.getCell('A2')!.value = 'مبرر';
  const output = unpack(new Uint8Array(await xlsx.writeBuffer()));
  // ExcelJS serializes a zero-width hidden column as width=9. Restore just
  // the original dimensions, keeping the serializer's own style references.
  const sourcePath = sheetPath(original, 'NotesCC'), outputPath = sheetPath(output, 'NotesCC');
  const sourceXml = sourcePath ? original[sourcePath] : undefined;
  if (sourceXml) {
    let normalStyleIndex = '0';
    const generatedStyles = strFromU8(output['xl/styles.xml']);
    output['xl/styles.xml'] = strToU8(generatedStyles.replace(/<cellXfs\b([^>]*)>([\s\S]*?)<\/cellXfs>/, (_whole, attributes: string, body: string) => {
      const formats = [...body.matchAll(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)];
      normalStyleIndex = String(formats.length);
      return `<cellXfs${attributes.replace(/count="\d+"/, `count="${formats.length + 1}"`)}>${body}${formats[0][0]}</cellXfs>`;
    }));
    const stylesXml = original['xl/styles.xml'] ? strFromU8(original['xl/styles.xml']) : '';
    const cellXfs = /<(?:x:)?cellXfs\b[^>]*>([\s\S]*?)<\/(?:x:)?cellXfs>/.exec(stylesXml)?.[1] ?? '';
    const formats = [...cellXfs.matchAll(/<(?:x:)?xf\b[^>]*?(?:\/>|>[\s\S]*?<\/(?:x:)?xf>)/g)].map(match => match[0].replace(/\s+/g, ''));
    const normalStyles = new Set(formats.flatMap((format, index) => format === formats[0] ? [String(index)] : []));
    const defaultCells = new Map<number, string[]>();
    for (const match of strFromU8(sourceXml).matchAll(/<(?:x:)?c\b([^>]*)(?:\/>|>)/g)) {
      const address = /\br="([A-Z]+)(\d+)"/.exec(match[1]);
      if (address && normalStyles.has(/\bs="(\d+)"/.exec(match[1])?.[1] ?? '0')) {
        const row = Number(address[2]); defaultCells.set(row, [...(defaultCells.get(row) ?? []), `${address[1]}${row}`]);
      }
    }
    const columns = [...strFromU8(sourceXml).matchAll(/<(?:x:)?col\b[^>]*\/>/g)].map(match => {
      const attr = (key: string) => new RegExp(`\\b${key}="([^"]*)"`).exec(match[0])?.[1];
      return { min: Number(attr('min')), max: Number(attr('max')), width: attr('width') };
    }).filter(column => column.width === '0');
    for (const [path, bytes] of Object.entries(output)) if (path === outputPath) {
      let xml = strFromU8(bytes).replace(/<col\b[^>]*\/>/g, tag => {
        const min = Number(/\bmin="(\d+)"/.exec(tag)?.[1]), max = Number(/\bmax="(\d+)"/.exec(tag)?.[1]);
        if (!columns.some(col => min >= col.min && max <= col.max)) return tag;
        return /\bwidth=/.test(tag) ? tag.replace(/\bwidth="[^"]*"/, 'width="0"') : tag.replace('/>', ' width="0"/>');
      });
      // An explicit normal-style blank overrides a column's style. ExcelJS
      // drops it on save, which otherwise makes trailing cells inherit '@'.
      xml = xml.replace(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g, (whole, attributes: string, content: string | undefined) => {
        const row = Number(/\br="(\d+)"/.exec(attributes)?.[1]), addresses = defaultCells.get(row);
        if (!addresses?.length) return whole;
        const cells = [...(content ?? '').matchAll(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)].map(match => match[0]);
        for (const address of addresses) {
          const index = cells.findIndex(cell => new RegExp(`\\br="${address}"`).test(cell));
          if (index < 0) cells.push(`<c r="${address}" s="${normalStyleIndex}"/>`);
          else cells[index] = /\bs=/.test(cells[index]) ? cells[index].replace(/\bs="\d+"/, `s="${normalStyleIndex}"`) : cells[index].replace('<c ', `<c s="${normalStyleIndex}" `);
        }
        const column = (cell: string) => (/\br="([A-Z]+)/.exec(cell)?.[1] ?? '').split('').reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0);
        return `<row${attributes}>${cells.sort((a, b) => column(a) - column(b)).join('')}</row>`;
      });
      output[path] = strToU8(xml);
    }
  }
  return zipSync(output);
}
