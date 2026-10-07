interface RosterPerson {
  id: string;
  name?: string | null;
  studentCode?: string | null;
  role?: string | null;
}

/** Filter the displayed register without removing people from its draft or submission. */
export function filterRoster<T extends RosterPerson>(
  people: T[],
  filters: { search: string; status: string; role?: string },
  getStatus: (id: string) => string,
): T[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return people.filter((person) => (
    (!search || [person.name, person.studentCode].some((value) => value?.toLocaleLowerCase().includes(search)))
    && (!filters.status || getStatus(person.id) === filters.status)
    && (!filters.role || person.role === filters.role)
  ));
}
