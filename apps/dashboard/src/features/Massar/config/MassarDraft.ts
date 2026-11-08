import type { MassarMark, MassarSheetDetail } from '@sms/contracts';
import { parseCell, type DraftCell } from './massarModel';

export const cellKey = (studentId: string, component: string) => `${studentId}:${component}`;
type Snapshot = { cells: Record<string, DraftCell>; saving: boolean; dirty: boolean; error: string | null; invalid: boolean; completed: number };
/** Serial, revision-checked sparse saves. Edits made during a request stay pending. */
export class MassarDraft {
  private listeners = new Set<() => void>();
  private saved: Record<string, DraftCell> = {};
  private revision: number;
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private state: Snapshot;
  constructor(private data: MassarSheetDetail, private save: (revision: number, marks: MassarMark[]) => Promise<{ revision: number }>) {
    this.revision = data.sheet.revision;
    const cells: Record<string, DraftCell> = {};
    for (const student of data.students) for (const component of data.components) {
      const mark = data.marks.find(mark => mark.studentId === student.id && mark.componentCode === component.code);
      cells[cellKey(student.id, component.code)] = { text: mark?.mark == null ? '' : String(mark.mark), absence: mark?.absence ?? 'none' };
    }
    this.saved = { ...cells };
    this.state = { cells, saving: false, dirty: false, error: null, invalid: false, completed: 0 };
    this.publish();
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.state;
  private changed(key: string, cell: DraftCell) { return JSON.stringify(cell) !== JSON.stringify(this.saved[key]); }
  private publish(patch: Partial<Snapshot> = {}) {
    const next = { ...this.state, ...patch }, values = Object.values(next.cells);
    next.dirty = Object.entries(next.cells).some(([key, cell]) => this.changed(key, cell));
    next.invalid = values.some(cell => !parseCell(cell, this.data.maxMark));
    next.completed = values.filter(cell => { const value = parseCell(cell, this.data.maxMark); return value && (value.mark !== null || value.absence === 'justified'); }).length;
    this.state = next;
    for (const listener of this.listeners) listener();
  }
  update(patches: Record<string, DraftCell>) {
    this.publish({ cells: { ...this.state.cells, ...patches } });
    this.schedule();
  }
  private schedule() {
    clearTimeout(this.timer);
    if (!this.disposed && !this.state.saving && !this.state.error) this.timer = setTimeout(() => { void this.flush(); }, 650);
  }
  async flush() {
    clearTimeout(this.timer);
    if (this.disposed || this.state.saving) return;
    const batch: Record<string, DraftCell> = {}, marks: MassarMark[] = [];
    for (const student of this.data.students) for (const component of this.data.components) {
      const key = cellKey(student.id, component.code), cell = this.state.cells[key], value = parseCell(cell, this.data.maxMark);
      if (value && this.changed(key, cell)) { batch[key] = cell; marks.push({ studentId: student.id, componentCode: component.code, ...value }); }
    }
    if (!marks.length) return;
    this.publish({ saving: true, error: null });
    try {
      const result = await this.save(this.revision, marks);
      this.revision = result.revision;
      Object.assign(this.saved, batch);
      this.publish({ saving: false });
      if (this.state.dirty) this.schedule();
    } catch (error) { this.publish({ saving: false, error: error instanceof Error ? error.message : String(error) }); }
  }
  retry = () => { this.publish({ error: null }); return this.flush(); };
  recovery() {
    return { revision: this.revision, cells: Object.fromEntries(Object.entries(this.state.cells).filter(([key, cell]) => this.changed(key, cell))) };
  }
  restore(value: unknown) {
    if (!value || typeof value !== 'object' || !('revision' in value) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || !('cells' in value) || !value.cells || typeof value.cells !== 'object') return;
    const cells = { ...this.state.cells };
    for (const [key, cell] of Object.entries(value.cells)) {
      if (key in cells && cell && typeof cell === 'object' && 'text' in cell && typeof cell.text === 'string' && 'absence' in cell && (cell.absence === 'none' || cell.absence === 'justified')) cells[key] = { text: cell.text, absence: cell.absence };
    }
    this.revision = Number(value.revision); this.publish({ cells });
  }
  activate() { this.disposed = false; if (this.state.dirty) this.schedule(); }
  sync(data: MassarSheetDetail) {
    if (this.state.dirty || this.state.saving || data.sheet.revision <= this.revision) return;
    this.revision = data.sheet.revision;
    const cells = { ...this.state.cells };
    for (const student of data.students) for (const component of data.components) {
      const mark = data.marks.find(mark => mark.studentId === student.id && mark.componentCode === component.code);
      cells[cellKey(student.id, component.code)] = { text: mark?.mark == null ? '' : String(mark.mark), absence: mark?.absence ?? 'none' };
    }
    this.saved = { ...cells }; this.publish({ cells, error: null });
  }
  discard() {
    this.dispose();
    this.publish({ cells: { ...this.saved }, saving: false, error: null });
  }
  dispose() { this.disposed = true; clearTimeout(this.timer); }
}
