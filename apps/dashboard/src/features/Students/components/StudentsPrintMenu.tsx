'use client';

import { useEffect, type RefObject } from 'react';
import type { Table } from '@tanstack/react-table';
import { Contact, Printer, TableProperties } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuTrigger, NButton, NSkeleton, useTableStore,
} from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import printStyles from '@/components/PrintMenu.module.css';

type Props = {
  loading: boolean;
  /** Active students in the current filters: what either choice prints. */
  count: number;
  /** Families print the list only; the photo sheet is for staff. */
  showPhotoSheet: boolean;
  tableRef: RefObject<Table<any> | null>;
  onPrintList: (table: Table<any> | null) => void;
  onPrintPhotoSheet: (table: Table<any> | null) => void;
};

/** One print button for the students page: the filtered list, or the class photo sheet. */
export function StudentsPrintMenu({ loading, count, showPhotoSheet, tableRef, onPrintList, onPrintPhotoSheet }: Props) {
  const { t } = useTranslation();
  const table = useTableStore.use.table();
  useEffect(() => {
    tableRef.current = table;
    return () => { tableRef.current = null; };
  }, [table, tableRef]);

  if (loading) {
    return (
      <div aria-hidden="true" className="hidden h-10 w-10 items-center justify-center rounded-md border border-input md:inline-flex">
        <NSkeleton className="h-4 w-4 rounded-full" />
      </div>
    );
  }

  const choices = [
    { key: 'list', icon: TableProperties, label: t('students.printMenu.list'), help: t('students.printMenu.listHelp'), onSelect: onPrintList },
    ...(showPhotoSheet ? [{ key: 'photos', icon: Contact, label: t('students.photoSheet.label'), help: t('students.photoSheet.help'), onSelect: onPrintPhotoSheet }] : []),
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NButton
          type="button"
          variant="outline"
          size="icon"
          className="hidden h-10 w-10 md:inline-flex"
          aria-label={t('insurance.print')}
          title={t('insurance.print')}
          disabled={!table}
          leftIcon={<Printer className="h-4 w-4" />}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto max-w-[calc(100vw-24px)] p-0">
        <div className={printStyles.printMenu} data-columns={1}>
          <DropdownMenuGroup className={printStyles.printColumn}>
            <DropdownMenuLabel className={printStyles.printTitle}><Printer aria-hidden />{t('insurance.print')}</DropdownMenuLabel>
            {choices.map(({ key, icon: Icon, label, help, onSelect }) => (
              <DropdownMenuItem key={key} className={printStyles.printItem} disabled={!count} onSelect={() => onSelect(tableRef.current)}>
                <Icon aria-hidden />
                <span><strong>{label}</strong><small>{help}</small></span>
                <span className={printStyles.printCount} dir="ltr" title={t('students.subtitle.count', { count })}>{count}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
