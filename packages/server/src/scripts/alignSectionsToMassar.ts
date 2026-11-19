import { sql } from 'drizzle-orm';
import { db } from '../database/db';
import {
  collapsePlacementsToSection, marksInSections, moveRecordsToSection, sectionCorrectionCandidates, uncoveredRecords,
} from '../modules/studentEnrollments/sectionCorrection';

// Every pupil sits all year in the section Massar lists them in (or, outside
// Massar, the one on their student record). A placement in another section of
// the same class was a mistake: it is corrected from the start of the year and
// the records kept under it follow the pupil. A placement in another class, or
// marks on the wrong section's tests, are reported and left for a person.
//
// Dry-run (default) does all of it inside a transaction and rolls it back, so
// its counts are exactly what an apply writes. Apply names the target, a run id
// and the account the audit records.
const option = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const target = option('target');
const runId = option('run-id');
const actorEmail = option('actor-email');
const yearLabel = option('year');
const apply = process.argv.includes('--apply');
if (!target || (apply && (!runId || !actorEmail))) {
  throw new Error('Use --target=<environment-label> [--year=<label>] [--apply --run-id=<unique-id> --actor-email=<admin email>]');
}

const REASON = 'Aligned with the Massar class list';
class DryRun extends Error {}

type Report = {
  student: string; class: string; section: string; source: string;
  attendance: number; ratings: number; remarks: number; incidents: number; rewards: number;
  unmatchedRatings: string[];
};

const corrected: Report[] = [];
const skipped: Array<{ student: string; class: string; reason: string }> = [];

try {
  await db.transaction(async (tx) => {
    const [year] = await tx.execute<{ id: string; label: string; active: boolean }>(yearLabel
      ? sql`select y.id, y.label, (s.active_academic_year_id = y.id) as active from academic_years y
          left join settings s on true where y.label = ${yearLabel} limit 1`
      : sql`select y.id, y.label, true as active from settings s join academic_years y on y.id = s.active_academic_year_id limit 1`);
    if (!year) throw new Error(yearLabel ? `No academic year ${yearLabel}` : 'No active academic year in the settings');

    let actor: { id: string; role: string } | undefined;
    if (actorEmail) {
      [actor] = await tx.execute<{ id: string; role: string }>(sql`
        select u.id, coalesce(r.name, 'admin') as role from users u left join roles r on r.id = u.role_id
        where lower(u.email) = lower(${actorEmail}) limit 1`);
      if (!actor) throw new Error(`No account with the email ${actorEmail}`);
    }

    for (const candidate of await sectionCorrectionCandidates(tx, year.id)) {
      if (candidate.otherClass) {
        skipped.push({ student: candidate.studentName, class: candidate.className, reason: 'placed in another class: correct it by hand' });
        continue;
      }
      const marks = await marksInSections(tx, candidate.studentId, year.id, candidate.wrongSectionIds);
      if (marks) {
        skipped.push({ student: candidate.studentName, class: candidate.className, reason: `${marks} marks on the other section's tests` });
        continue;
      }
      // Placements first: a recorded attendance row is accepted only where the pupil is placed on its day.
      const placements = await collapsePlacementsToSection(tx, {
        enrollmentId: candidate.enrollmentId, targetSectionId: candidate.targetSectionId, reason: REASON, actorId: actor?.id ?? null,
      });
      const moved = await moveRecordsToSection(tx, {
        studentId: candidate.studentId, yearId: year.id,
        wrongSectionIds: candidate.wrongSectionIds, targetSectionId: candidate.targetSectionId,
      });
      if (year.active) {
        await tx.execute(sql`update students set section_id = ${candidate.targetSectionId},
            class_id = (select class_id from sections where id = ${candidate.targetSectionId}), updated_at = now()
          where id = ${candidate.studentId} and section_id is distinct from ${candidate.targetSectionId}`);
      }
      const left = await uncoveredRecords(tx, candidate.studentId, year.id);
      if (left) throw new Error(`${candidate.studentName}: ${left} records would lose their placement; nothing was written`);
      if (actor) {
        await tx.execute(sql`insert into audit_logs (id, user_id, user_role, action, resource, resource_id, status, metadata)
          values (${`aln_${runId}_${candidate.enrollmentId}`}, ${actor.id}, ${actor.role}, 'correct', 'student-enrollments',
            ${candidate.enrollmentId}, 'success', ${JSON.stringify({
              academicYearId: year.id, reason: REASON, runId, source: candidate.source,
              before: placements.before, after: placements.after, moved,
            })}::jsonb)`);
      }
      corrected.push({
        student: candidate.studentName, class: candidate.className,
        section: `${candidate.wrongSectionNames.join('+')} → ${candidate.targetSectionName}`, source: candidate.source,
        attendance: moved.attendance, ratings: moved.ratings, remarks: moved.remarks, incidents: moved.incidents, rewards: moved.rewards,
        unmatchedRatings: moved.unmatchedRatings.map((rating) => `${rating.subject} · ${rating.competency} · ${rating.month}`),
      });
    }

    process.stdout.write(JSON.stringify({ target, year: year.label, mode: apply ? 'apply' : 'dry-run', runId: apply ? runId : null }) + '\n');
    if (!apply) throw new DryRun();
  });
} catch (error) {
  if (!(error instanceof DryRun)) {
    console.error(error);
    console.error('\nNothing was written: the transaction was rolled back.');
    process.exit(1);
  }
}
{
  console.table(corrected.map(({ unmatchedRatings, ...row }) => ({ ...row, unmatched: unmatchedRatings.length })));
  const unmatched = corrected.flatMap((row) => row.unmatchedRatings.map((rating) => `${row.student} (${row.class}): ${rating}`));
  if (unmatched.length) console.log(`\nRatings left in the other section's grid (no competency of that name in the right grid):\n${unmatched.join('\n')}`);
  if (skipped.length) { console.log('\nNot corrected:'); console.table(skipped); }
  console.log(`\n${apply ? 'Corrected' : 'Would correct'} ${corrected.length} pupils; ${skipped.length} left for review.${apply ? '' : ' Dry run: nothing was written.'}`);
  process.exit(0);
}
