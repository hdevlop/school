import DisciplineTable from '@/features/Discipline/components/DisciplineTable';

// The server layout checks the shared page rule; the API also enforces
// permissions and ownership for the records and actions inside this table.
export default function DisciplinePage() {
  return <DisciplineTable />;
}
