# Plan: Homework (devoirs · الواجبات المنزلية)

Proposed 2026-11-12. Phases 1 to 4 implemented 2026-11-13 (see §11). Left:
the checks in §11.3, which need a migrated database or the production host.

Teachers now write the day's exercises in each pupil's *cahier de liaison*
(دفتر المراسلة). This module puts them in School: the teacher posts once for the
class, attaches a photo of the board or a book page, and the parents and pupils
of that class see it.

Production stores everything on one disk (155 GB, shared with other
installations; see §8), so storage use is part of the design: §4 compression, §5 limits, §6 cleanup, §7 monitoring. §8 records what
the deployment already does about logs and what it does not.

## 1. Why not an assessment

`assessments` was the first candidate (`type: 'assignment'`). It does not fit:

1. `totalMarks` and `passingMarks` are `notNull`. Most homework is not graded,
   so the teacher would have to invent a "/20" every day.
2. An assessment has one `date`. Homework has two: when it was given and when
   it is due.
3. Homework would appear among the graded work in the grade screens and could
   enter averages.
4. An assessment has no attachments and no parent acknowledgment.

Homework is a separate module that **may link** to an assessment
(`assessmentId`) when the teacher later grades it.

## 2. Data model

New tables in `packages/server/src/modules/homework/homeworkSchema.ts`:

**`homework`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `idField()` | |
| `teacherAssignmentId` | `teacherAssignmentRef('restrict')` | Teacher, subject and class |
| `academicYearId` | ref → `academicYears` (`restrict`) | Year scope |
| `sectionIds` | `jsonb string[]` | `null` = every section of the class, as for assessments |
| `date` | `date`, not null | Given on. Named `date` so `placedOnSourceDate` applies unchanged |
| `dueOn` | `date`, nullable | "Pour jeudi" |
| `title` | `text`, not null | "Exercices 4 et 5 p. 32" |
| `content` | `text`, nullable | Details |
| `assessmentId` | `assessmentRef`, nullable, `set null` | When the work is later graded |
| timestamps | | |

Index: `(academic_year_id, date)`.

**`homework_attachments`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `idField()` | |
| `homeworkId` | ref → `homework` (`cascade`) | |
| `fileHash` | `text`, not null | SHA-256 of the **stored** bytes; also the storage path (§5.3) |
| `kind` | enum `HOMEWORK_ATTACHMENT_KIND_VALUES` | `image`, `pdf` |
| `mimeType`, `size`, `width`, `height` | | `width`/`height` for images only |
| `position` | `integer` | Order shown |
| `purgedAt` | `timestamp`, nullable | Set when §6 removes the file; the row stays |
| timestamps | | |

Index: `(file_hash)`, used for reference counting.

**`homework_acknowledgments`** (phase 2): `homeworkId`, `studentId`,
`parentUserId`, `seenAt`, unique on `(homework_id, student_id, parent_user_id)`.

Declared in `@sms/contracts`: `HOMEWORK_ATTACHMENT_KIND_VALUES = ['image', 'pdf']`,
pinned in `packages/contracts/tests/enums.test.ts`.

## 3. Access

Follows the assessment pattern exactly.

- **Permissions** (`permissions.json`): `create:homework`, `read:homework`,
  `update:homework`, `delete:homework`. Defaults in `rolePermissions.json`:
  teacher has all four, monitor/supervisor read, parent and student read.
  Existing databases adopt the defaults once with `bun run seed:role-permissions`.
- **Ownership** (`HomeworkGuards.ts`): same chains as `AssessmentGuards.ts`.
  The teacher's own rows go through `teacherAssignments → teachers → staff`;
  monitor/supervisor go through `targetsManagedSection`; student and parent go
  through `placedOnSourceDate(homework, ...)`. The table has the four columns
  `DatedAcademicSource` asks for.
- **Year scope:** register `HomeworkController` in `config/yearScope.ts`.
- **Files are private.** The namespace is `homework`. Add it to
  `PrivateStorageGuard` next to `massar` so the generic `/api/storage/...` route
  refuses it. Files are served only by
  `GET /homework/:id/attachments/:attachmentId`, which reads the homework row
  through ownership first. This matters because a photo of the board can show
  pupils' faces or names, and today any signed-in user can open any non-Massar
  file whose path they know.

## 4. Compression

### 4.1 In the browser, before upload

New `apps/dashboard/src/lib/compressImage.ts` (domain-neutral, so `lib` is the
right owner):

- `createImageBitmap(file, { imageOrientation: 'from-image' })` so phone photos
  are not sideways.
- Longest edge ≤ **1600 px** (a board or a book page stays readable at this size).
- Encode with `canvas.toBlob(..., 'image/webp', 0.75)`. If the browser cannot
  make WebP, use JPEG at 0.8.
- Keep the original if it is already smaller than the result.
- Typical result: 4–8 MB → **150–350 KB**.

The form's file input uses `accept="image/*,application/pdf"`. A second button,
"Prendre une photo", uses `capture="environment"` to open the rear camera on a
phone.

### 4.2 On the server, always

The browser step is a convenience; the server decides what is written. In
`HomeworkAttachmentService`, with `sharp` (already pinned, `0.35.5`):

```ts
sharp(input, { limitInputPixels: 40_000_000 })   // refuse decompression bombs
  .rotate()                                       // apply EXIF orientation
  .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 75 })
  .toBuffer({ resolveWithObject: true });
```

`sharp` drops metadata unless `.withMetadata()` is called, so this also removes
**EXIF GPS location**, camera model and timestamps. A test pins this: a fixture
JPEG with GPS tags comes out with none.

PDFs are stored as received. A PDF cannot be shrunk safely without a separate
tool, so §5 limits it instead.

## 5. Limits

### 5.1 Per request (`HomeworkDto` + `HomeworkValidator`)

| Limit | Value | Why |
| --- | --- | --- |
| Attachments per homework | **5** | A board photo plus a few book pages |
| Image upload | ≤ 10 MB before processing | Equal to the storage plugin's `maxFileSize`; covers a browser that skipped §4.1 |
| Stored image | ≤ 1 MB after processing | Refuse rather than store an outlier |
| PDF | ≤ **5 MB** | No server compression |
| MIME types | `image/jpeg`, `image/png`, `image/webp`, `image/heic`*, `application/pdf` | Checked from the bytes (sharp metadata / `%PDF-`), not the declared type |

\* HEIC (iPhone) is accepted only if the deployed `sharp` build can decode it.
Otherwise §4.1 has already converted it in the browser, because Safari decodes
HEIC. Verify this on the production image before listing it in the UI.

Refusals use catalog keys (`homework.errors.tooManyFiles`, ...) in all four
languages, so `test:server-i18n` covers them.

### 5.2 Per teacher

Quota: **500 MB of live (not purged) attachments per teacher per academic
year**. That is about 2,000 compressed photos. Stored as a School setting so an
admin can change it. When a teacher passes it, uploads are refused with a
message saying so. The text of the homework can still be posted.

### 5.3 Store the same file once

The stored path is `homework/<sha256>.webp` (or `.pdf`). If the hash already
exists, the new attachment row points at the existing file and nothing is
written. A file is deleted only when **no** `homework_attachments` row with
`purgedAt is null` references its hash.

Limitation: this saves space only for **identical** files, for example a
teacher re-posting the same scan or two teachers sharing one PDF. Two photos of
the same page are different files.

## 6. Cleanup

The homework **text is kept forever**. Only the files expire.

- **Retention:** a file is purged **180 days after `dueOn`** (or after `date` if
  there is no due date). Stored as a School setting.
- **`HomeworkCleanupService`**, modeled on `MassarCleanupService`: runs at
  start, then every hour (`setInterval(...).unref()`), with a `running` guard
  and a logged retry on error. Each sweep:
  1. sets `purgedAt` on the expired attachments;
  2. deletes each hash that no live row references any more;
  3. deletes files in the `homework` namespace that no row references at all
     and that are older than 1 hour. This catches files left by a failed upload.
     The 1-hour grace period protects an upload still in progress.
- Deleting a homework cascades its attachment rows; step 2 then removes the
  files.
- The UI shows a purged attachment as "Photo supprimée après 6 mois", never as
  a broken image.

### 6.1 Expected use

40 teachers × 2 photos per school day × 180 days ≈ 14,400 photos per year.

| | Per year | Kept on disk |
| --- | --- | --- |
| Raw phone photos | ~57 GB | grows without end |
| After §4 | ~3.6 GB | **~1.8–3.6 GB**, steady, because of §6 |

## 7. Monitoring

- Add `storage` to `/api/health/status`: free and total bytes of
  `SCHOOL_STORAGE_PATH` via `fs.statfs`.
- Admins get one alert (existing `alerts` module) when free space falls under
  **20%**, and another under **10%**. Each level alerts only once until space
  recovers.
- Backups: `BackupService.createBackup()` builds the whole archive, files
  included, **in memory**. The app's `mem_limit` is 1024 MB. Once
  homework files exceed a few hundred MB, either stream the archive or exclude
  the `homework` namespace from the full backup (it expires anyway). This
  decision has to be made before the backup reaches that size, not after.

## 8. Logs and other disk use (checked 2026-11-12)

**Container logs are rotated.** In `compose.production.yml`, `x-app` sets
`json-file` with `max-size: 10m`, `max-file: "5"`. `app`, `migrate` and
`notifications-worker` inherit it through `<<: *app`; `postgres` and `redis` set
the same. The ceiling is ~50 MB per service, ~250 MB in total. The app writes no
log files of its own: it logs to stdout through Najm's `LoggerService`.

**The host, read from the Dokploy API (v0.30.8) on 2026-11-12:**

| | Value |
| --- | --- |
| Disk | 154.9 GB total, 83.1 GB used (54%), ~72 GB free |
| Shared by | `school-school` (demo), `school-jhl` (customer), `kafil-demo`, Dokploy itself |
| Docker Cleanup | on (`enableDockerCleanup: true`) |
| Dokploy log cleanup | on, daily at 00:00 |
| Docker images | 23.5 GB, 12.1 GB reclaimable |
| Docker volumes | 651 MB (all Postgres and Redis data together) |
| Build cache | 0 B (images are built in CI) |

Consequences for this plan:

1. **The disk is shared.** The quota in §5.2 and the alerts in §7 must leave
   room for every installation on the host, not just one school.
2. **Images use more space than data.** Each School image is ~3.3 GB, and four
   unused ones (13 GB) were still on disk even with Docker Cleanup on. Making
   the image smaller (the Dockerfile copies the root and dashboard
   `node_modules` whole) saves more space than any photo setting will for a
   long time.
3. **~59 GB is outside Docker's accounting.** That includes the storage bind
   mounts (`SCHOOL_STORAGE_HOST_PATH`), the OS, Dokploy's data and the systemd
   journal. The API does not show it. Check on the host with
   `du -sh /srv/* /var/lib/* /var/log 2>/dev/null | sort -h` and
   `journalctl --disk-usage`. Cap the journal with `SystemMaxUse=500M` in
   `/etc/systemd/journald.conf`.
4. **Redis AOF** (`--appendonly yes`) rewrites itself automatically; with a
   96 MB `maxmemory` it stays small.

## 9. Phases

1. **Homework text:** schema, migration, permissions, guards, year scope, CRUD,
   teacher form, parent/student list. No files.
2. **Attachments:** §3 private serving, §4, §5, §6, tests.
3. **Acknowledgment:** "Vu par le parent", and a count per class for the teacher.
4. **Monitoring:** §7.

## 10. Tests

- `homework/HomeworkGuards.test.ts`: generated SQL of every owned read, as in
  `test:ownership`.
- `test:security`: the four permissions exist; `homework` is refused by the
  generic storage route; the attachment route asks for `read:homework`.
- Attachment service: EXIF GPS is removed; output ≤ 1600 px; a 6th file, an
  oversized PDF, and a renamed `.exe` are refused; uploading the same file twice
  stores it once.
- Cleanup: an expired attachment is purged; a hash shared with a live row is
  kept; an orphan younger than 1 hour is kept, older is deleted.
- `bun run i18n:check` for the new keys.

## 11. Implementation (2026-11-13)

Module: `packages/server/src/modules/homework`. Page: `/homework`
(`apps/dashboard/src/features/Homework`). Migration: `0119_homework.sql`.
Tests: `bun run test:homework`, also part of `bun run test`.

### 11.1 Decisions made while building

- **Who writes.** `create/update/delete:homework` let a route run;
  `HomeworkValidator.ensureMayWrite` then allows only a teacher (for their own
  assignments) and the school-wide roles. A monitor or supervisor given the
  permission later in the roles screen still only reads.
- **A teacher posts as themselves.** The body's `teacherId` is read only for a
  school-wide author; a teacher's own record is looked up from their login.
- **Text first, then files.** The form saves the homework, then sends its files
  in one multipart request (`POST /homework/:id/attachments`). A refused file
  (quota, size, type) leaves the text posted and says so, as §5.2 promises.
  One refused file refuses the whole request; nothing is half-stored.
- **Reading a file.** `GET /homework/:id/attachments/:attachmentId` reads the
  homework through ownership and the selected year before the file. The
  dashboard fetches it with the session and shows a local object URL; a plain
  `<img src>` would carry neither the token nor the year header.
- **Phase 3.** `homework_acknowledgments` and `POST /homework/:id/acknowledge`:
  a parent marks the homework seen for each child it was given to. A parent's
  list carries their children and when they marked it; staff lists carry
  `seenCount` / `studentCount`; a pupil's carries neither.
- **Settings.** `homework_quota_mb` (default 500, 0 stops new files) and
  `homework_retention_days` (default 180, 7 to 3650) are in Settings →
  Academic → Homework files. Defaults live in `@sms/contracts` (`homework.ts`).
- **Cleanup.** Hourly, as §6. Before deleting an orphan it asks again whether
  a live row points at the hash, so an identical upload during the sweep is
  not lost.
- **Monitoring (§7).** `/api/health/status` returns `storage: { freeBytes,
  totalBytes }` of the disk holding `SCHOOL_STORAGE_PATH` (or `null`).
  `StorageMonitorService` checks hourly and writes one `system` alert (read by
  the school-wide roles) under 20% free and another under 10%, in the school's
  language; `settings.storage_alert_level` remembers the level until space
  recovers. The level is of the whole shared disk, not of School's files.
- **Backups (§7, decided).** Homework files are left out of the full backup
  (`BACKUP_EXCLUDED_FILE_NAMESPACES` in `@sms/contracts/backup`); the homework
  text is kept. A restore marks every attachment purged, so the files read as
  removed instead of broken. The backup screen says so.
- **Seed resets** clear homework before teachers and years
  (`SeedService.clearAllData`, `packages/seed/.../reset-demo.ts`).

### 11.2 Not done

- §8 is host work, not code: capping the journal and slimming the image.
- HEIC: the server accepts what its `sharp` build decodes (`heif`), and the
  browser converts first where it can (Safari). Not verified on the
  production image (see §5.1).

### 11.3 Still to check

1. `bun run db:migrate`, then `bun run seed:role-permissions` once on each
   existing database: 0119 adds the tables and settings columns but grants
   nothing (`RolePermissions.test.ts` records this for the monitor role).
2. `bun --env-file=apps/dashboard/.env.local run test:security:transport`
   over a migrated `school_history_test`: the new routes all name a
   permission, so none should appear on the open or sign-in-only lists.
3. In the browser: a teacher posts from a phone with "Take a photo"; a parent
   opens it, sees the photo and marks it seen; the teacher's "Seen by parents"
   count moves; a 6th file and a 6 MB PDF are refused with the message.
4. On the production image: `sharp` decodes an iPhone HEIC, and
   `/api/health/status` reports the storage bind mount, not the container's
   root disk.
