import { and, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, own, ownedIds, where, when } from '../../auth';
import { announcements } from '../../database/schema';
import { Class } from '../classes/ClassGuards';

// Published, started and not expired. Drafts and expired notices stay with staff.
export function isLive() {
  const now = new Date().toISOString();
  return and(
    eq(announcements.isPublished, true),
    or(isNull(announcements.publishDate), lte(announcements.publishDate, now)),
    or(isNull(announcements.expiryDate), gt(announcements.expiryDate, now)),
  )!;
}

const reaches = (group: 'students' | 'parents' | 'teachers') => () =>
  and(isLive(), inArray(announcements.targetAudience, ['all', group]))!;

// One of the user's classes, as the Class rules define them. A class
// announcement lists its classes in classIds; older rows keep one in classId.
const reachesOwnClass = (userId: string, role: string) => and(
  isLive(),
  eq(announcements.targetAudience, 'class'),
  sql`exists (select 1 from ${ownedIds(Class, role, userId)} as member_class
    where ${announcements.classIds} @> jsonb_build_array(member_class.id) or ${announcements.classId} = member_class.id)`,
)!;

/** A live announcement reaches its audience: everyone, or one group. */
export const Announcement = own(announcements)
  .for('student', when(reaches('students')))
  .for('parent', when(reaches('parents')))
  .for('teacher', when(reaches('teachers')));

// A najm rule is one join chain, so the other ways to reach an announcement
// are alternative tokens the repository ORs with the rule above.
export const AnnouncementForClass = own(announcements)
  .for('student', when(reachesOwnClass))
  .for('parent', when(reachesOwnClass))
  .for('teacher', when(reachesOwnClass));

/** Authors see what they wrote, drafts included. */
export const AnnouncementByAuthor = own(announcements)
  .for('student', where(announcements.authorId))
  .for('parent', where(announcements.authorId))
  .for('teacher', where(announcements.authorId));

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
