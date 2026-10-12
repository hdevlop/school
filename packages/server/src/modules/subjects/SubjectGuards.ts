import { Can, CanSchoolWide } from '../../auth';

export const canAccessSubject = () => Can('read:subjects');
export const canUpdateSubject = () => Can('update:subjects');
export const canCreateSubject = () => Can('create:subjects');
export const canDeleteSubject = () => Can('delete:subjects');
// The unfiltered catalog; a teacher reads the subjects of their own classes.
export const canAccessAllSubjects = () => CanSchoolWide('read:subjects');
