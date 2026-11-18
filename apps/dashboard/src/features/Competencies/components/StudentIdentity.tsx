import { cn, NAvatar } from 'najm-kit';
import type { SheetStudent } from './StudentCompetencySheet';

export function StudentIdentity({ student, prominent = false }: { student: SheetStudent; prominent?: boolean }) {
  const initials = student.name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join('').toLocaleUpperCase();
  const Name = prominent ? 'h2' : 'div';
  return (
    <div className={cn('flex min-w-0 flex-1 items-center', prominent ? 'gap-2.5 @xl/sheet:gap-3' : 'gap-3')}>
      <div aria-hidden="true" className="shrink-0">
        <NAvatar src={student.image ?? undefined} fallback={initials || '?'} size="md"
          classNames={{ avatar: prominent ? '@xl/sheet:size-12' : undefined, fallback: 'bg-muted text-foreground' }} />
      </div>
      <div className="min-w-0">
        <Name className={cn('font-semibold', prominent ? 'wrap-anywhere text-base leading-tight @xl/sheet:text-xl' : 'truncate text-sm')} title={student.name}>
          <bdi dir="auto">{student.name}</bdi>
        </Name>
        {student.altName ? (
          <div className={cn('text-muted-foreground', prominent ? 'wrap-anywhere text-xs @xl/sheet:text-sm' : 'truncate text-sm')} title={student.altName}>
            <bdi lang="ar" dir="auto">{student.altName}</bdi>
          </div>
        ) : null}
      </div>
    </div>
  );
}
