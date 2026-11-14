import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { StorageService } from 'najm-storage';
import {
  HOMEWORK_DEFAULT_QUOTA_MB, HOMEWORK_LIMITS as limits,
  type HomeworkAttachment, type HomeworkAttachmentKind,
} from '@sms/contracts';
import { Err, Inject, LoggerService, Service } from '../../najm';
import { HomeworkAttachmentRepository, type HomeworkAttachmentRow } from './HomeworkAttachmentRepository';
import { HomeworkValidator } from './HomeworkValidator';

/** Private: the generic storage route refuses it (PrivateStorageGuard). */
export const HOMEWORK_NAMESPACE = 'homework';
/** The stored name is the hash of the stored bytes, so the same file is stored once. */
export const homeworkFilePath = (fileHash: string, kind: HomeworkAttachmentKind) =>
  `${fileHash}.${kind === 'pdf' ? 'pdf' : 'webp'}`;
/** A stored homework file's name, and nothing else in the namespace. */
export const HOMEWORK_FILE_NAME = /^([0-9a-f]{64})\.(?:webp|pdf)$/;

// What sharp may decode. HEIC is here because Safari converts it in the
// browser first; a server build without the decoder refuses it as unsupported.
const IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif']);
const PDF_MAGIC = Buffer.from('%PDF-');
// A 40-megapixel ceiling refuses a decompression bomb before it is decoded.
const MAX_INPUT_PIXELS = 40_000_000;
const WEBP_QUALITY = 75;

export type PreparedAttachment = {
  bytes: Buffer;
  fileHash: string;
  kind: HomeworkAttachmentKind;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
};

type HomeworkTarget = { id: string; academicYearId: string | null; teacher: { id: string | null } | null };

const publicAttachment = (row: HomeworkAttachmentRow): HomeworkAttachment => ({
  id: row.id, kind: row.kind as HomeworkAttachmentKind, mimeType: row.mimeType, size: row.size,
  width: row.width, height: row.height, position: row.position, purgedAt: row.purgedAt,
});

/**
 * The files of a homework. The browser compresses first, but that is a
 * convenience: what is written is decided here, from the bytes.
 */
@Service()
export class HomeworkAttachmentService {
  @Inject(LoggerService) private log!: LoggerService;

  constructor(
    private repository: HomeworkAttachmentRepository,
    private validator: HomeworkValidator,
    private storage: StorageService,
  ) {}

  /**
   * One upload as it will be stored. A PDF is kept as received; an image is
   * rotated upright, fitted in 1600 px and re-encoded as WebP. sharp writes no
   * metadata unless asked, so the photo's GPS position, camera and time go.
   */
  async prepare(input: Uint8Array): Promise<PreparedAttachment> {
    const source = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    if (source.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
      this.validator.ensurePdfSize(source.length);
      return { bytes: source, fileHash: sha256(source), kind: 'pdf', mimeType: 'application/pdf', size: source.length, width: null, height: null };
    }
    this.validator.ensureImageUploadSize(source.length);
    const { data, info } = await this.encode(source);
    this.validator.ensureStoredImageSize(data.length);
    return { bytes: data, fileHash: sha256(data), kind: 'image', mimeType: 'image/webp', size: data.length, width: info.width, height: info.height };
  }

  private async encode(source: Buffer) {
    try {
      const { format } = await sharp(source, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
      if (!format || !IMAGE_FORMATS.has(format)) return this.validator.refuseUnsupportedFile();
      return await sharp(source, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({ width: limits.imageEdge, height: limits.imageEdge, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true });
    } catch (error) {
      // A refusal raised above passes through; anything sharp threw means the
      // bytes are not an image it can read (a renamed .exe, a truncated file).
      if (Err.isHttp(error)) throw error;
      return this.validator.refuseUnsupportedFile();
    }
  }

  /** Stores the uploads of one request; refuses all of them if any one is refused. */
  async add(target: HomeworkTarget, uploads: File[]) {
    this.validator.ensureFilesProvided(uploads.length);
    const existing = (await this.repository.listForHomework(target.id)).filter((row) => !row.purgedAt);
    this.validator.ensureAttachmentRoom(existing.length, uploads.length);

    const prepared: PreparedAttachment[] = [];
    for (const upload of uploads) {
      // Refuse an oversized body before it is copied and decoded.
      this.validator.ensureImageUploadSize(upload.size);
      prepared.push(await this.prepare(new Uint8Array(await upload.arrayBuffer())));
    }

    if (target.teacher?.id && target.academicYearId) {
      const quotaMb = (await this.repository.storageSettings())?.quotaMb ?? HOMEWORK_DEFAULT_QUOTA_MB;
      const live = await this.repository.liveBytesOfTeacher(target.teacher.id, target.academicYearId);
      this.validator.ensureWithinQuota(live, prepared.reduce((sum, file) => sum + file.size, 0), quotaMb);
    }

    for (const file of prepared) {
      const path = homeworkFilePath(file.fileHash, file.kind);
      // The same bytes are already there: point the new row at them.
      if (await this.storage.getInfo(HOMEWORK_NAMESPACE, path)) continue;
      await this.storage.save(HOMEWORK_NAMESPACE, path, file.bytes, file.mimeType);
    }
    const start = existing.reduce((max, row) => Math.max(max, row.position + 1), 0);
    const rows = await this.repository.insert(prepared.map((file, index) => ({
      homeworkId: target.id, fileHash: file.fileHash, kind: file.kind, mimeType: file.mimeType,
      size: file.size, width: file.width, height: file.height, position: start + index,
    })));
    return rows.map(publicAttachment);
  }

  async remove(homeworkId: string, attachmentId: string) {
    const row = this.validator.ensureAttachmentExists(await this.repository.remove(homeworkId, attachmentId));
    await this.removeUnreferenced([row]);
    return publicAttachment(row);
  }

  /** The stored bytes of one attachment of a homework the caller already read through ownership. */
  async read(homeworkId: string, attachmentId: string) {
    const row = this.validator.ensureAttachmentExists(await this.repository.findInHomework(homeworkId, attachmentId));
    this.validator.ensureAttachmentLive(row);
    const kind = row.kind as HomeworkAttachmentKind;
    const bytes = this.validator.ensureFileStored(await this.storage.get(HOMEWORK_NAMESPACE, homeworkFilePath(row.fileHash, kind)));
    return { bytes, mimeType: row.mimeType, kind };
  }

  async filesOf(homeworkId: string) {
    return (await this.repository.listForHomework(homeworkId))
      .map((row) => ({ fileHash: row.fileHash, kind: row.kind as HomeworkAttachmentKind }));
  }

  /**
   * Deletes the files no live row points at any more. A failure is logged and
   * left to the hourly cleanup, so it never fails the request that removed
   * the row.
   */
  async removeUnreferenced(files: Array<{ fileHash: string; kind: HomeworkAttachmentKind | string }>) {
    try {
      const live = await this.repository.liveHashesAmong([...new Set(files.map((file) => file.fileHash))]);
      for (const file of files) {
        if (live.has(file.fileHash)) continue;
        await this.storage.delete(HOMEWORK_NAMESPACE, homeworkFilePath(file.fileHash, file.kind as HomeworkAttachmentKind));
      }
    } catch (error) {
      this.log.error('Homework file removal failed; the cleanup sweep will retry', error);
    }
  }
}

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
