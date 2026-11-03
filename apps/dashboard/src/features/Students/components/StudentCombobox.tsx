'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Command as CommandPrimitive } from 'cmdk';
import {
  BaseInput, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem,
  FormControl, FormField, FormItem, FormLabel, FormMessage, NIcon,
  Popover, PopoverContent, PopoverTrigger, cn, useVariantPreset,
} from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import {
  buildStudentPickerOptions, scoreStudentPickerOption, type StudentPickerOption,
} from '../config/studentPickerOptions';

type StudentComboboxInputProps = {
  value?: string | null;
  onChange: (studentId: string) => void;
  students?: Parameters<typeof buildStudentPickerOptions>[0];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  ariaLabel?: string;
  disabled?: boolean;
  status?: 'default' | 'error';
  className?: string;
};

function StudentOptionRow({ option, selected }: { option: StudentPickerOption; selected: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <Check className={cn('size-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium"><bdi>{option.name}</bdi></span>
      <span className="max-w-[35%] shrink-0 truncate text-xs text-muted-foreground"><bdi>{option.placement ?? t('common.notAssigned')}</bdi></span>
      {/* The code gives way first on the narrowest phones; it can still be searched. */}
      {option.code && <bdi dir="ltr" className="shrink-0 font-mono text-xs text-muted-foreground max-[380px]:hidden">{option.code}</bdi>}
    </>
  );
}

/**
 * Kit's ComboboxInput shows one line of plain text per item, which cannot tell
 * two students with the same name apart at a glance. This one is built from
 * the same Kit parts and shows each student's class, section and code.
 */
export function StudentComboboxInput({
  value, onChange, students, placeholder, searchPlaceholder, emptyMessage, ariaLabel, disabled = false, status = 'default', className,
}: StudentComboboxInputProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const pointerDismissed = useRef(false);
  const options = useMemo(() => buildStudentPickerOptions(students), [students]);
  const selected = options.find((option) => option.value === value);
  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    // Modal, or the dialog around a form keeps the mouse wheel from scrolling the list.
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <BaseInput
          ref={triggerRef}
          status={status}
          role="combobox"
          aria-label={ariaLabel || placeholder}
          aria-expanded={open}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(event) => {
            if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            setOpen(true);
          }}
          className={cn('cursor-pointer outline-none data-[state=open]:border-ring', className)}
        >
          <span className={cn('min-w-0 flex-1 truncate text-sm', !selected && 'text-muted-foreground')}>
            {selected ? (
              <>
                <bdi>{selected.name}</bdi>
                {selected.placement && <span className="text-xs text-muted-foreground"> · <bdi>{selected.placement}</bdi></span>}
              </>
            ) : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </BaseInput>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-[min(20rem,calc(100vw-2rem))] p-0"
        align="start"
        onPointerDownOutside={() => {
          pointerDismissed.current = true;
        }}
        onCloseAutoFocus={(event) => {
          if (!pointerDismissed.current) return;
          event.preventDefault();
          pointerDismissed.current = false;
          triggerRef.current?.blur();
        }}
      >
        <Command defaultValue={selected?.value} filter={(_, search, keywords) => scoreStudentPickerOption(search, keywords)}>
          <CommandInput className="h-9" placeholder={searchPlaceholder ?? t('students.picker.search')} />
          {/* cmdk's own list: Kit's CommandList moves the rows out of the element
              cmdk searches, which leaves the arrow keys and Enter without a row. */}
          <CommandPrimitive.List data-slot="command-list" className="max-h-75 overflow-x-hidden overflow-y-auto">
            <CommandEmpty>{emptyMessage ?? t('students.picker.noResults')}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[...option.keywords]}
                  onSelect={() => commit(option.value === value ? '' : option.value)}
                  className="cursor-pointer gap-2"
                >
                  <StudentOptionRow option={option} selected={option.value === value} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandPrimitive.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type FormStudentComboboxProps = Omit<StudentComboboxInputProps, 'value' | 'onChange' | 'status' | 'ariaLabel'> & {
  name?: string;
  formLabel: string;
  icon?: ReactNode | React.ComponentType<any>;
  required?: boolean;
};

/** The form field around StudentComboboxInput, laid out as FormInput lays out its own. */
export function FormStudentCombobox({ name = 'studentId', formLabel, icon, required = false, disabled = false, className, ...input }: FormStudentComboboxProps) {
  const { control } = useFormContext();
  const preset = useVariantPreset();
  return (
    <FormField control={control} name={name} render={({ field, fieldState }) => (
      <FormItem className={preset.item}>
        <FormLabel className={preset.label}>
          {icon && <NIcon icon={icon as any} size={16} className="shrink-0 text-muted-foreground" />}
          {formLabel}
          {required && !disabled && <span className="ms-1 text-destructive">*</span>}
        </FormLabel>
        <FormControl>
          <StudentComboboxInput
            {...input}
            value={field.value}
            onChange={field.onChange}
            ariaLabel={formLabel}
            disabled={disabled}
            status={fieldState.error ? 'error' : 'default'}
            className={cn(preset.input, className)}
          />
        </FormControl>
        <FormMessage className={preset.error} />
      </FormItem>
    )} />
  );
}
