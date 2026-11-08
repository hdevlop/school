import { strFromU8, unzipSync } from 'fflate';

export type UploadFileInfo = { classes: string[]; students: number | null };
export const isMassarUpload = (file: File) => /\.(xlsx|zip)$/i.test(file.name);

function unpack(bytes: Uint8Array, accept: (name: string) => boolean, limit: number) {
  let size = 0, count = 0;
  return unzipSync(bytes, { filter: entry => {
    size += entry.originalSize;
    if (++count > 2000 || size > limit) throw new Error('Archive exceeds the import limits');
    return accept(entry.name);
  } });
}

const elements = (node: Document | Element, name: string) => Array.from(node.getElementsByTagNameNS('*', name));
function xml(bytes: Uint8Array | undefined) {
  if (!bytes) throw new Error('Missing workbook entry');
  const document = new DOMParser().parseFromString(strFromU8(bytes), 'application/xml');
  if (elements(document, 'parsererror').length) throw new Error('Unreadable workbook entry');
  return document;
}

/** Display information only. The server still validates every workbook during Review. */
function workbookInfo(bytes: Uint8Array): UploadFileInfo {
  const entries = unpack(bytes, name => /^xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/.*\.xml)$/.test(name), 40 * 1024 * 1024);
  const sheet = elements(xml(entries['xl/workbook.xml']), 'sheet').find(item => item.getAttribute('name') === 'NotesCC');
  const relationId = sheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  const relation = elements(xml(entries['xl/_rels/workbook.xml.rels']), 'Relationship').find(item => item.getAttribute('Id') === relationId);
  const target = relation?.getAttribute('Target');
  if (!sheet || !target || relation?.getAttribute('TargetMode') === 'External') throw new Error('Missing NotesCC sheet');
  const path = new URL(target, 'https://workbook.local/xl/').pathname.slice(1);
  const strings = entries['xl/sharedStrings.xml'] ? elements(xml(entries['xl/sharedStrings.xml']), 'si').map(item => elements(item, 't').map(text => text.textContent ?? '').join('')) : [];
  const cells = elements(xml(entries[path]), 'c');
  const value = (cell: Element | undefined) => {
    if (!cell || elements(cell, 'f').length) return '';
    const raw = elements(cell, 'v')[0]?.textContent ?? '';
    return cell.getAttribute('t') === 's' ? strings[Number(raw)] ?? '' : cell.getAttribute('t') === 'inlineStr' ? elements(cell, 't').map(text => text.textContent ?? '').join('') : raw;
  };
  const className = value(cells.find(cell => cell.getAttribute('r') === 'I9')).trim();
  if (!/^\dAP(?:G|IC)-\d+$/.test(className)) throw new Error('Missing Massar class');
  const students = cells.filter(cell => {
    const row = /^C(\d+)$/.exec(cell.getAttribute('r') ?? '');
    return row && Number(row[1]) >= 18 && value(cell).trim();
  }).length;
  return { classes: [className], students };
}

/** Reads locally, without uploading or creating an import draft. */
export async function inspectMassarUpload(file: File): Promise<UploadFileInfo> {
  if (!isMassarUpload(file) || file.size > 15 * 1024 * 1024) return { classes: [], students: null };
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (/\.xlsx$/i.test(file.name)) return workbookInfo(bytes);
    const entries = unpack(bytes, name => /\.xlsx$/i.test(name) && !name.startsWith('__MACOSX/'), 30 * 1024 * 1024);
    const classes = new Map<string, number>();
    for (const contents of Object.values(entries)) {
      try {
        const info = workbookInfo(contents);
        classes.set(info.classes[0], Math.max(classes.get(info.classes[0]) ?? 0, info.students ?? 0));
      } catch { /* Review reports the server's precise refusal for this entry. */ }
    }
    return { classes: [...classes.keys()], students: classes.size ? [...classes.values()].reduce((sum, count) => sum + count, 0) : null };
  } catch {
    // A browser display read must never prevent the server from checking a file.
    return { classes: [], students: null };
  }
}
