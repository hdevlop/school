import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

/** Share the action column's intrinsic width with confirmation inputs. */
export function BackupSteps({ children }: { children: ReactNode }) {
  return <ol className="grid min-w-0 grid-cols-[1.5rem_minmax(0,max-content)_minmax(0,1fr)] gap-x-3 text-sm">{children}</ol>;
}

/** One numbered step; its number turns into a check once the step is done. */
export function BackupStep({ number, title, hint, done, last = false, htmlFor, children }: {
  number: number;
  title?: ReactNode;
  hint?: string;
  done: boolean;
  last?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <li className={`col-span-3 grid grid-cols-subgrid gap-y-2 ${last ? '' : 'pb-5'}`}>
      <div className={`flex flex-col items-center ${title ? 'row-span-2' : 'self-center'} ${last ? '' : '-mb-5'}`}>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${done ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}>
          {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : number}
        </span>
        {!last && <span aria-hidden="true" className={`mt-1 w-px flex-1 transition-colors ${done ? 'bg-emerald-600/50' : 'bg-border'}`} />}
      </div>
      {title && <div className="col-span-2 grid min-w-0 gap-0.5">
        {htmlFor
          ? <label className="font-medium leading-6" htmlFor={htmlFor}>{title}</label>
          : <p className="font-medium leading-6">{title}</p>}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>}
      <div className="col-span-2 col-start-2 grid min-w-0 grid-cols-subgrid gap-y-2">
        {children}
      </div>
    </li>
  );
}
