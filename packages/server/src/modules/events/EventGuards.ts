import { sql } from 'drizzle-orm';
import { Can, own, when } from '../../auth';
import { composeGuards } from 'najm-guard';
import { events } from '../../database/schema';

export const canAccessEvent        = composeGuards(Can('read:events'));
export const canUpdateEvent        = composeGuards(Can('update:events'));
export const canCreateEvent        = composeGuards(Can('create:events'));
export const canDeleteEvent        = composeGuards(Can('delete:events'));
export const canAccessAllEvents    = composeGuards(Can('read:events'));
export const canManageParticipants = composeGuards(Can('manage:participants'));

// The stored audience; an event saved without one is public, as the column defaults.
const audience = sql`coalesce(${events.visibility}, 'public')`;

// An event with no class or section target is for the whole school.
const untargeted = sql`(${events.classId} is null and ${events.sectionId} is null
  and coalesce(jsonb_array_length(${events.classIds}), 0) = 0)`;

// The reader's student (or one of a parent's children) sat in a targeted class
// or section on the event's first day; the current section would show a
// transferred student the new class's past events.
const placedInTarget = (userId: string, parent: boolean) => sql`exists (
  select 1 from student_enrollments enrollment
  join student_enrollment_placements placement on placement.enrollment_id = enrollment.id
  join students student on student.id = enrollment.student_id
  ${parent ? sql`join student_parents link on link.student_id = student.id
    join parents parent on parent.id = link.parent_id` : sql``}
  where ${parent ? sql`parent.user_id` : sql`student.user_id`} = ${userId}
    and placement.valid_from <= ${events.startDate}
    and (placement.valid_to is null or placement.valid_to > ${events.startDate})
    and (enrollment.left_on is null or enrollment.left_on > ${events.startDate})
    and (placement.class_id = ${events.classId}
      or placement.section_id = ${events.sectionId}
      or coalesce(${events.classIds}, '[]'::jsonb) @> jsonb_build_array(placement.class_id))
)`;

/**
 * Who sees an event besides the school-wide roles. `visibility` names the
 * audience: teachers read public, teacher and staff events and every event
 * they organize, private ones included; students and parents read public
 * events and their own audience's, and a class or section event only when
 * the student (or a child) was in it on its first day.
 */
export const Event = own(events)
  .for('teacher', when((userId: string) => sql`(${audience} in ('public', 'teachers', 'staff')
    or ${events.organizerId} = ${userId})`))
  .for('student', when((userId: string) => sql`(${audience} in ('public', 'students')
    and (${untargeted} or ${placedInTarget(userId, false)}))`))
  .for('parent', when((userId: string) => sql`(${audience} in ('public', 'parents')
    and (${untargeted} or ${placedInTarget(userId, true)}))`));
