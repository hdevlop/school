import HomeworkFollowUpTable from '@/features/Homework/components/HomeworkFollowUpTable';

// The server layout checks the shared page rule; the API also enforces
// permissions and ownership for the records inside this table.
export default function HomeworkFollowUpPage() {
  return <HomeworkFollowUpTable />;
}
