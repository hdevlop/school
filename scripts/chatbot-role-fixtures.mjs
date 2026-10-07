const named = value => value && typeof value.id === 'string' && value.id.trim()
  && typeof value.name === 'string' && value.name.trim();
const account = value => value && typeof value.email === 'string' && value.email.includes('@');
const outsider = value => named(value) && Array.isArray(value.parentPhones)
  && value.parentPhones.every(phone => typeof phone === 'string' && phone.trim());

/** Validate private API-derived fixtures before authenticating or sending chats. */
export function validateRoleFixtures(value) {
  const people = value?.people;
  if (value?.version !== 1 || value.source !== 'internal-school-mcp-rest'
    || !Number.isFinite(Date.parse(value.capturedAt)) || !people
    || !/^\d{4}-\d{4}$/.test(people.year ?? '')
    || !account(people.parent) || !Array.isArray(people.parent.children) || people.parent.children.length < 2
    || new Set(people.parent.children.map(child => child?.id)).size !== people.parent.children.length
    || !people.parent.children.every(named) || !outsider(people.parent.other)
    || people.parent.children.some(child => child.id === people.parent.other.id)
    || !account(people.teacher) || !Number.isInteger(people.teacher.assignments) || people.teacher.assignments < 1
    || !Number.isInteger(people.teacher.studentCount) || people.teacher.studentCount < 1
    || !Array.isArray(people.teacher.ownStudentIds)
    || new Set(people.teacher.ownStudentIds).size !== people.teacher.studentCount
    || !people.teacher.ownStudentIds.every(id => typeof id === 'string' && id.trim())
    || !outsider(people.teacher.other) || people.teacher.ownStudentIds.includes(people.teacher.other.id)
    || !account(people.student) || !named(people.student.self) || !outsider(people.student.other)
    || !people.student.other.parentPhones.length || people.student.self.id === people.student.other.id
    || !named(people.followUp)) throw new Error('Invalid internal-API role fixtures; no chats sent');
  return people;
}
