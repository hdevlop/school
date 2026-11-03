export default function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span aria-hidden="true" className="h-3.5 w-1 rounded-full bg-primary/70" />
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm sm:tracking-wider">{title}</h3>
    </div>
  );
}
