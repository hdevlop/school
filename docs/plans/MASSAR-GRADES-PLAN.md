# Plan: Massar grade sheets (نقط المراقبة المستمرة)

Implementation update (2026-11-06): the single-page dashboard in §1–§5 is
implemented. `/massar` now owns upload, Contrôle selection, Overview, paper
entry, printing and acceptance. Old URLs redirect there. The external checks
in §6 and the owner's desktop/phone/Arabic review remain open. Teacher
notifications remain outside this implementation; optional due dates are included.

Downloads stay editable. A signed, year-bound receipt records the downloaded
sheet revisions; acceptance refuses a receipt if any sheet changed in the
meantime. The acceptance question survives a page refresh in the same browser.
Unsaved entry drafts survive year switches in that tab, retaining their original
revision. No new permission is required.

Migration `0103_massar_pending_students` retains unmatched students' Massar
identities and order. Fix → add students in School → Check again now unblocks
their class without another upload. Legacy imports need one re-import to recover
those details. Migration `0104_massar_round_due_date` adds the optional due date.
Overdue sheets stay editable until acceptance. Both migrations were verified
against the local fixture before applying to local `school`.

Status (2026-11-06): v1 is built and committed (`f91351f`): import, catalog,
sheet generation, mark entry, progress, export, permissions, tests. How it
works is in the code (`packages/server/src/modules/massar/`) and in the
verification guide [Massar grades](../tests/massar-grades.md).

The specification below covers:
1. the new, simpler dashboard (§1–§5), agreed with the owner on 2026-11-06;
2. the checks that still need real Massar files (§6).

Owner role: registrar.

## 1. Why the current screens are hard

Seen by the owner on the first try:

1. **Wrong order.** The page opens on *Rounds*, empty. The first real step,
   uploading the Massar files, is the last tab (*Setup*).
2. **"Round" is our word.** The registrar thinks "Semester 1 · Contrôle 1".
3. **The menu is twice:** sidebar children *and* tabs on the page.
4. **Empty pages give no next step.** *All sheets* shows three filters over
   nothing; *New round* is offered before any file is uploaded.
5. **Technical words:** "clean export required as a template", "mappings",
   "roster", "copy labels exactly from Massar".

Most users are not used to apps. The new page copies a page they already
understand: the **Insurance register** (class buttons → the paper → Print).

## 2. The new flow

1. **Upload** the Massar files (once a year; more files any time).
2. **Open** a Contrôle → every teacher sees their sheets.
3. **Teachers type** marks on a sheet that looks like the Massar paper; it
   saves by itself. The registrar follows on the **Overview**.
4. **Download for Massar** → upload to Massar → "Did Massar accept the
   files?" **Yes** → the sheets are locked 🔒.

### 2.1 Registrar, step by step

Example: 12 primary classes (1APG-1 … 6APG-2); the registrar starts with
Arabic in September. Principal and admin follow the same flow.

**Step 1 — first visit.** Sidebar → **Massar** → empty state (§3.2 A):
"No Massar files yet" + **[⬆ Upload Massar files]**.

**Step 2 — choose files.** The button opens the **Add files** dialog: drop
zone for `.xlsx`, `.zip` or a folder, one or many → **[Check]**.

**Step 3 — check, nothing saved yet.** Same dialog (§3.4):

```
12 files read · العربية · 12 classes · 354 students
✓ 1APG-1 → School class 1AP A   30 students    [change]
⚠ 3APG-1 → 3AP A · 2 students not in School    [see]
✗ 1 file refused: opened and saved in Excel    [why?]
                                     [Back] [Confirm]
```

- ✓ ready. ⚠ saved, but that class waits until its problem is fixed.
  ✗ file not used; "why?" says what to do ("export it again from Massar").
- **[see]** lists the students: "In Massar, not in School: EL AMRANI Yassine
  (code J135…)". Fix = add them in **Students** with the same code Massar.

**Step 4 — confirm.** Toast "12 classes saved". The page shows state B:
"12 classes · العربية", the line "3APG-1 is waiting: 2 students missing
[Fix]", and **[Open Semester 1 · Contrôle 1]**.

**Step 5 — open Contrôle 1.** Short confirmation:

```
┌ Open Semester 1 · Contrôle 1? ────────────────────┐
│ Teachers of 11 classes will see their sheets now. │
│ 3APG-1 will be added when it is ready.            │
│                                                   │
│ Marks due by:  [ 15/11/2026 📅 ]   (optional)     │
│                               [Cancel] [Open]     │
└───────────────────────────────────────────────────┘
```

The **due date** is optional and can be changed later from the Contrôle
dropdown ("Change due date"). It never locks anything: after the date,
teachers can still type; the sheets are only shown as **Late** (§3.2 C).

The page opens on the **Overview** (§3.2 C), everything ⚪ Empty.

**Step 6 — follow.** On the Overview, cells turn 🟠 "20/29" then 🟢 "Done";
"Still missing, by teacher" says whom to call. After the due date, sheets not
done turn 🔴 **Late** and their teachers come first in that list. For marks given on paper, the
registrar clicks the cell (or the class button, then the subject) and types
them on the paper sheet (§3.3).

**Step 7 — download.** **[⬇ Download for Massar]** downloads every sheet of
the Contrôle in one zip. Empty marks stay empty (Massar accepts them). If
some sheets are not full, one line warns first: "2 sheets are not full.
Download anyway?" Downloading does not lock anything.

**Step 8 — upload to Massar** outside School, as today (all classes at once).

**Step 9 — confirm Massar accepted.** After the download, the page asks:
"Did Massar accept the files? **[Yes]** [Not yet]". **Yes** → the downloaded
sheets are locked 🔒; teachers can no longer change them. **Not yet** → the
question stays on the page until answered.

**Step 10 — a correction after sending.** **Only the registrar reopens** a 🔒
sheet (button on the sheet). Then the teacher or the registrar edits; the
sheet shows ⚠ "changed after sending" and the page says "1 sheet changed —
download and send again" → steps 7–9.

**Step 11 — the next Contrôle.** The Contrôle dropdown → **+ Open next
Contrôle** → steps 5–10 again. Semester 2 the same.

**Any time:**
- **+ Add files** (header): a new subject (French in October), a class after
  a change in Massar. Steps 2–4; it adds and updates, never deletes. New
  subjects get their sheets in the Contrôles already open.
- **A student arrives:** add them in Massar first, then in Students with the
  same code Massar and class, then **+ Add files** with the class's new Massar
  file. The next Contrôle's sheets include them.
- **A student leaves:** withdraw them in Students. Later sheets leave them
  out; marks already entered stay. Massar has no arrivals/departures screen of
  its own.

### 2.2 Teacher, in short

Example: Mrs Salma, French in 3APG-1 and 4APG-2.

1. Sidebar → **Massar**. Before the registrar opens a Contrôle: "No Contrôle
   open yet. The registrar will open it."
2. Once open, the page opens **directly on her first sheet** (§3.5). Her
   buttons: `[3APG-1] [4APG-2]`, subject `[Français]` only.
3. She types; it saves by itself. A full sheet turns 🟢 for the registrar.
   No Submit button.
   The due date is shown above her sheet: "Marks due by 15/11/2026 — 3 days
   left"; on the last day in orange "Due today"; after it in red "Late — due
   15/11/2026". She can still type when late.
4. She can change marks until the registrar answers **Yes** (step 9); then
   the sheet is 🔒 and she asks the registrar to reopen it.
5. **Print** gives her the paper version if she prefers to write first.

Decided: a **due date** per Contrôle (2026-11-06). Open for the teacher flow
(owner to decide): a notification when a Contrôle opens.

## 3. Screens

### 3.1 Sidebar

One item: **Massar** (no children), after **Grades**. Shown to registrar,
principal, admin, teacher and supervisor, as `PAGE_ACCESS` allows today.
Monitor, parent and student: nothing (unchanged).

No tabs on the page. Secondary screens open from buttons.

### 3.2 One Massar page that shows the next step

**Every empty screen looks like the rest of the app.** Same as *Teachers*
when it has no teacher: the page header, then one centred `NEmptyState`
(`surface="panel"`, Massar icon, title, one line, one button). The button is
shown only to a role allowed to use it (`PermissionButton` /
`useViewerRole().can()`); other roles get the title and line only. No big
drop zone on the page: the button opens the **Add files** dialog (§3.4), which
holds the drop zone.

**State A — no file uploaded yet**

```
┌──────────────────────────────────────────────────────────────┐
│ [icon] Massar                                   2026-2027 ▾  │
│        Not set up                                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                         [Massar icon]                        │
│                 No Massar files yet                          │
│   Upload the empty grade files you exported from Massar.     │
│                  [ ⬆ Upload Massar files ]                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

| Role | Title | Line | Button |
|---|---|---|---|
| Registrar, principal, admin (`manage:massar`) | No Massar files yet | Upload the empty grade files you exported from Massar. | Upload Massar files → Add files dialog |
| Teacher, supervisor | Massar is not ready yet | The registrar has not uploaded the Massar files. | — |

**State B — files uploaded, no Contrôle open yet**

Same centred empty state, under a header that already shows what is loaded
("12 classes · العربية", **+ Add files** in the header actions).

| Role | Title | Line | Button |
|---|---|---|---|
| Registrar, principal, admin | No Contrôle open | Open Contrôle 1 so teachers can enter their marks. | Open Semester 1 · Contrôle 1 |
| Teacher, supervisor | No Contrôle open yet | The registrar will open it. Your sheets appear here. | — |

Other empty cases, same component:

| Case | Title | Line |
|---|---|---|
| Teacher with no sheet in the open Contrôle | You have no Massar sheets | If this is wrong, ask the registrar to check your classes and subjects. |
| Supervisor with no supervised class | No class assigned to you | — |
| Load failed / refused | `NErrorState` / `NForbiddenState` (as *Teachers*) | — |

**State C — a Contrôle is open (main screen for the rest of the year)**

Like the *Insurance register*: one row of **class buttons**, then the paper.
The registrar and the supervisor also get one **Overview** button first.

```
┌──────────────────────────────────────────────────────────────────────┐
│ [icon] Massar · Contrôle 1 — Semester 1 ▾      [⬇ Download for Massar] │
├──────────────────────────────────────────────────────────────────────┤
│ [📋 Overview] [● 1APG-1] [● 1APG-2] [● 2APG-1] … [● 6APG-2]  [⎙ Print] │
└──────────────────────────────────────────────────────────────────────┘
```

Header:
- **One dropdown** "Contrôle 1 — Semester 1 ▾" lists the opened Contrôles and
  ends with **+ Open next Contrôle** and **Change due date** (registrar). It
  replaces "rounds". Next to it: "Due 15/11/2026 · 3 days left" (red "Late"
  after the date) when a due date is set.
- **Labels are never typed.** The screen shows simple words in the user's
  language ("Contrôle 1 — Semester 1", "الفرض 1 — الدورة الأولى"). The file
  gets Massar's exact text, read from the uploaded files (§4.1).
- **[⬇ Download for Massar]** (registrar) — §2.1 step 7.
- **+ Add files** (registrar) in the header actions menu.
- The "Did Massar accept the files?" question (§2.1 step 9) and the
  "1 sheet changed — download and send again" line appear under the header
  when they apply.

Buttons row:
- **📋 Overview** — registrar, principal, admin, supervisor. The registrar's
  page opens here.
- **Class buttons** — Massar classes in level order, with the insurance page
  colours (`CLASS_DOCUMENT_COLORS`) and a status dot: 🟢 all done, 🟠
  started, ⚪ empty, 🔒 sent, ⚠ changed after sending, ⏸ waiting (students
  missing).
- **[⎙ Print]** — one button, prints what is shown (§3.6).

**Overview** (registrar, supervisor):

```
 52 of 72 sheets done · Due 15/11/2026 — Late by 2 days · 20 sheets late

 Class    العربية   Français   Maths    Science   Islamic   Art
 1APG-1   🟢 Done   🟢 Done    🟢 Done  🟢 Done   🟢 Done   🟢 Done
 1APG-2   🔴 Late 20/29  🟢 Done  🔴 Late  🔴 Late 10/29  🔴 Late  🔴 Late
 3APG-1   ⏸ Waiting · 2 students missing  [Fix]
 4APG-1   🔴 Late — no teacher (registrar enters)

 Still missing, by teacher (late first):
   🔴 Mr Hassan    2APG-1 العربية, 2APG-2 العربية
   🔴 Mrs Amina    1APG-2 Islamic, 1APG-2 Art
```

- **Words with the colours** ("Done", "Empty", "20/29", "Late"), never
  symbols alone.
- **Due date:** before it, cells are 🟠 / ⚪ as usual; after it, every sheet
  not done is 🔴 **Late** (with its count when started). Without a due date,
  nothing is ever late. Class buttons show 🔴 when one of their sheets is late.
- **Click a cell** → that class and subject (§3.3).
- **Still missing, by teacher** answers "whom do I call?".
- With one subject uploaded (September, Arabic only) the table has one
  column plus the teacher's name.
- Phone: one card per class with its subjects as small badges.

**A class button** → a **subject row** with the same status colours, then
the paper sheet of the chosen subject (§3.3):

```
 [📋 Overview] [● 1APG-1] [● 1APG-2] …                         [⎙ Print]
 [🟢 العربية] [🟢 Français] [⚪ Maths] [🟠 Science] [⚪ Islamic] [⚪ Art]
```

**Reuse:** `apps/dashboard/src/features/Students/insurance/InsuranceRegisterPage.tsx`
already has the class buttons, the paper preview (`PlanningPreview`) and
printing (`printPlanningDocument`). The Massar page uses the same pieces; the
paper sheet adds editable mark cells.

### 3.3 The sheet (on the paper)

Drawn like the Massar paper, so it is familiar, but easier. Primary example
(several components, /10):

```
 ┌───────────────────────────────────────────────────────────────────┐
 │ مؤسسة جان هنري لامبير             نقط المراقبة المستمرة      [logo] │
 │ المستوى: الأول ابتدائي عام   القسم: 1APG-1   السنة: 2026/2027      │
 │ الدورة: الأولى   الفرض: 1   المادة: العربية   الأستاذة: Mrs Salma   │
 ├────┬────────────┬────────────────┬──────────┬────────┬────────┬──────┤
 │ ر.ت│ رقم مسار   │ اسم التلميذ     │ تاريخ    │الاستماع│ القراءة│الكتابة│
 │    │            │                │ الازدياد │والتحدث │        │      │
 ├────┼────────────┼────────────────┼──────────┼────────┼────────┼──────┤
 │ 01 │ J130045678 │ AMINE Rachid   │ 03-05-19 │  8.5   │   7    │  9   │
 │ 02 │ J130045679 │ BENANI Sara    │ 11-09-19 │  9     │ [   ]  │      │
 │ 03 │ J130045680 │ CHAFIK Omar    │ 22-01-19 │ مبرر   │  مبرر  │ مبرر │
 │ 04 │ J130045681 │ DRISSI Lina    │ 30-07-19 │ 12 ⚠   │        │      │
 └────┴────────────┴────────────────┴──────────┴────────┴────────┴──────┘
              ✓ Saved · 18 / 30 done          [◀ العربية]  [Maths ▶]
```

Collège: the same sheet with **one** mark column, /20.

- **Columns:** N°, code Massar, name, birth date, then one column per
  component with Massar's names, in Massar's student order.
- **Saves by itself** while typing: "Saving…" / "✓ Saved" / "Not saved —
  retry". Uses today's revision check, so two people editing the same sheet
  cannot overwrite each other silently.
- **No Submit button.** A sheet with every mark (or مبرر) filled is "Done".
- **Checks at once:** a mark above the maximum or below 0 turns red with
  "max is 10" and is not saved. Empty cells are light yellow.
- **Absence per component**, like the Massar file: a key (for example `A`) or
  the cell menu sets **مبرر**; a mark and مبرر together are refused.
- **Keyboard:** Enter = next student, Tab = next component, arrows move.
- **Paste from Excel:** a column or block copied from Excel fills the cells
  from the selected one down; invalid values are shown red, not saved.
- **Stays readable:** header row and name column stay visible while
  scrolling. Right-to-left in Arabic, left-to-right in French/English.
- **◀ / ▶** = previous or next subject of the same class (typing paper sheets
  one after another).
- **After "Yes, Massar accepted":** grey, 🔒 "Sent to Massar", read-only;
  **[Reopen]** for the registrar only (§2.1 step 10).
- **Phone:** one student at a time, the components as fields, the مبرر
  checkbox, **◀ / ▶** students.

### 3.4 Add files (dialog, registrar)

Same import as today, said simply:

```
┌ Add Massar files ──────────────────────────────────────────┐
│ 12 files read · العربية · 12 classes · 354 students         │
│ ✓ 1APG-1 → School class 1AP A   30 students    [change]    │
│ ✓ 1APG-2 → School class 1AP B   29 students    [change]    │
│ ⚠ 3APG-1 → 3AP A · 2 students not in School    [see]       │
│ ✗ 1 file refused: opened and saved in Excel    [why?]      │
│ Subject: العربية → School subject Arabic ✓                 │
│                                                            │
│ Nothing changes until you confirm.      [Back] [Confirm]   │
└────────────────────────────────────────────────────────────┘
```

- One line per class, grouped by level; "change" opens the existing mapping
  editor.
- No word "template". If no untouched Massar file is in the upload, say:
  "Upload at least one file exactly as Massar gave it (not opened in Excel)."
- A small **Massar settings** link (registrar only) opens what *Setup* holds
  today besides the upload: class/subject matching. Arrivals and departures
  stay in Students.

### 3.5 Who sees what

| | Overview | Class → subject → paper | Print | Download for Massar, + Add files, Massar accepted?, Reopen |
|---|---|---|---|---|
| Registrar, principal, admin | ✅ opens here | ✅ all, edit | ✅ | ✅ |
| Supervisor | ✅ own classes | ✅ own classes, read-only | ✅ | — |
| Teacher | — | ✅ own classes and subjects, edit until 🔒 | ✅ | — |
| Monitor, parent, student | — | — | — | — |

- **Teacher:** no Overview; the page opens **directly on their first sheet**;
  class buttons show only their classes and the subject row only their
  subjects (the rule in `MassarGuards.ts`, unchanged). With one class and one
  subject there is nothing to choose: the sheet only.
- **Supervisor:** the registrar's page, read-only, limited to the classes
  they supervise.

### 3.6 Print

One **[⎙ Print]** button that prints what is shown, with the marks typed so
far (empty cells stay empty, so the same print is the paper for teachers):
- **Overview** selected → every sheet of the Contrôle the viewer can see,
  one page each;
- **a class** selected → all its subjects, one page each.

## 4. Server changes the new screens need

### 4.1 Labels come from the files

- `POST /massar/rounds` no longer takes `termLabel` / `examLabel` from the
  user: only `term` and `exam`.
- The server takes the labels from `massar_subjects.observedRounds` (what the
  imported files said for that term and فرض).
- If no file showed that term/فرض yet: use Massar's standard text from a fixed
  list built from the 2025/26 files, and tell the registrar "these labels were
  not seen in your files yet" (§6.3, §6.4). Collège rules from v1 stay.

### 4.2 Small additions

- **Massar accepted → lock:** a new action that sets the downloaded sheets to
  `exported`. Today the download itself does this; download alone will no
  longer lock.
- **Download:** every sheet of the Contrôle the registrar may export, in one
  zip (today's export with the full list).
- **No Submit:** the dashboard stops offering it; "Done" = every cell filled.
  The server's `submitted` status stays but is no longer set by the new
  screens; teachers edit until `exported`.
- **Reopen after sending:** registrar (`manage:massar`) only, as today.
- **Auto-save:** today's `PUT /massar/sheets/:id/marks` with its revision;
  the sheet sends small batches. No new route expected.
- **Overview data:** built from the existing sheet list (`GET /massar/sheets`,
  class × subject × status × missing × teacher). New route only if it is slow.
- "Open next Contrôle" = today's create round with the next number.
- **Due date:** one nullable `due_date` (date) column on `massar_rounds`
  (new migration), set when opening and changed with a small `PUT` on the
  round (`manage:massar`). "Late" is computed from it and the school's
  business date (`getBusinessDateOnly`); nothing is locked by it.
- No new permission.

## 5. Build steps

1. **Agree on the mockups** — done with the owner on 2026-11-06 (registrar
   flow, middle version with Overview, paper sheet, who sees what, due
   date). Teacher notification still open (§2.2).
2. **Labels from files** (§4.1) + **due date** column and route (§4.2) +
   tests; remove the label fields from the form.
3. **One page** with states A/B/C; delete the tabs and the sidebar children;
   keep the old URLs redirecting to `/massar`.
4. **Class buttons + Overview**, reusing the insurance page pieces; phone
   cards; "Still missing, by teacher".
5. **Paper sheet** (§3.3): auto-save, checks, absence per component,
   keyboard, paste from Excel, ◀ / ▶ subjects, phone view; no Submit.
6. **Download for Massar**, "Did Massar accept?" lock, Reopen, "changed after
   sending".
7. **Print** (§3.6).
8. **Add files dialog** + Massar settings screen.
9. **Teacher and supervisor** versions of the same page (§3.5).
10. Owner review on desktop, phone and in Arabic, with a non-technical user.

The implementation reuses the matching editor and app styling from the earlier uncommitted redesign. Its tabs and separate
round/sheet lists have been replaced by the agreed flow in §3.

Rules from CLAUDE.md still apply: texts in the four catalogs, `NTable` error
props, `PAGE_ACCESS`, mobile cards, keyboard-first sheet.

**Tests:** labels (seen / not seen / collège), page state per role, Overview
counts and "missing by teacher", due date (none / before / due today / late,
late teachers first, never locks), "Done" without Submit, download of the full
Contrôle, "Massar accepted" lock and "changed after sending", only the
registrar reopens a sent sheet, auto-save with a stale revision, paste of
valid and invalid values, keyboard moves, teacher opens on their first sheet,
supervisor read-only, failed load is not an empty Overview.

## 6. Checks that still need real Massar files

| # | Check | Blocks |
|---|---|---|
| 1 | **Massar import test:** one generated sheet with one class's real marks, imported into Massar, marks checked there. Then set `MASSAR_FILLED_EXPORT_VERIFIED=true`. | filled export |
| 2 | A row with an **empty hidden id** (new student) imports correctly. Include one in test 1, or wait for a real arrival. | new students without re-import |
| 3 | Collège: a فرض 2 export, to confirm `#2#` / `الفرض الثاني`. | collège beyond فرض 1 |
| 4 | الأنشطة المندمجة sheets for other subjects than Islamic level 6. | that Contrôle type |
| 5 | Allowed decimals (0.25? 0.5? 2 digits?). The file only says `decimal 0..max`. | entry checks |
| 6 | PE and Amazigh: graded in Massar? | full subject list |
| 7 | Next year's `M5` value: confirm from the first 2027/28 export (expected 20). | next year |
| 8 | Uploading again a file Massar already accepted (after a correction, §2.1 step 10) replaces its marks without error. | the one-button download |

Decided: monitors see no Massar sheets (2026-11-06).

## 7. Later (not planned)

Link Massar marks to School grades and report cards; import Massar final
results; school components that roll up into Massar ones (CP French 6 → 4).
