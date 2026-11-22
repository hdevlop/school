import { Can, CanSchoolWide } from '../../auth';

export const canAccessSubject = () => Can('read:subjects');
export const canUpdateSubject = () => Can('update:subjects');
export const canCreateSubject = () => Can('create:subjects');
export const canDeleteSubject = () => Can('delete:subjects');
// A level's own sub-subjects: a teacher their subjects in their levels (SubjectValidator.ensureMayEditLevel).
export const canUpdateLevelSubSubjects = () => Can('update:sub-subjects');
// The unfiltered catalog; a teacher reads the subjects of their own classes.
export const canAccessAllSubjects = () => CanSchoolWide('read:subjects');
