'use client';

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, RotateCcw, Save, Settings } from 'lucide-react';
import { Button, Checkbox, cn, surfaceBorderClasses } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { orderSidebarItems, sidebarItemIds, sidebarKeyForItem, sidebarPermission, type SidebarKey, type SidebarOrderId } from '@sms/contracts/access-control';
import type { GatedNavItem } from '@/shared/schoolNavigation';
import type { PageViewer } from '@/shared/pageAccess';

type Props = {
  items: GatedNavItem[];
  order: SidebarOrderId[];
  visibleKeys: Set<SidebarKey>;
  eligibility: Map<string, boolean>;
  viewer: PageViewer;
  locked: boolean;
  saving: boolean;
  dirty: boolean;
  onOrderChange: (order: SidebarOrderId[]) => void;
  onVisibilityChange: (keys: SidebarKey[], visible: boolean) => void;
  onSave: () => void;
};

type RowVisibility = { checked: boolean | 'indeterminate'; disabled: boolean; eligible: boolean; toggle: (visible: boolean) => void };

function SortableSidebarRow({ item, index, count, disabled, visibility, onMove, children }: {
  item: GatedNavItem; index: number; count: number; disabled: boolean;
  visibility: RowVisibility; onMove: (to: number) => void; children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled });
  const Icon = item.icon;
  return (
    <li ref={setNodeRef} data-sidebar-layout-item={item.id} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative rounded-lg bg-card', surfaceBorderClasses(), isDragging && 'z-10 shadow-lg ring-2 ring-primary/30')}>
      <div className={cn('flex min-h-14 items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3', !visibility.eligible && 'opacity-50')}>
        <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} disabled={disabled}
          aria-label={t('roleAccess.layout.drag', { name: item.label })}
          className="flex size-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default active:cursor-grabbing">
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
        <Checkbox checked={visibility.checked} disabled={visibility.disabled}
          aria-label={`${item.label}: ${t('roleAccess.sidebar')}`} onCheckedChange={(checked) => visibility.toggle(checked === true)} />
        {Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium"><span className="break-words">{item.label}</span>{item.children && <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />}</p>
          {!visibility.eligible && <p className="mt-0.5 text-xs text-muted-foreground">{t('roleAccess.layout.requiresView')}</p>}
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button type="button" size="icon" variant="ghost" className="size-8" disabled={disabled || index === 0}
            aria-label={t('roleAccess.layout.moveUp', { name: item.label })} title={t('roleAccess.layout.moveUp', { name: item.label })} onClick={() => onMove(index - 1)}><ArrowUp aria-hidden="true" className="size-3.5" /></Button>
          <Button type="button" size="icon" variant="ghost" className="size-8" disabled={disabled || index === count - 1}
            aria-label={t('roleAccess.layout.moveDown', { name: item.label })} title={t('roleAccess.layout.moveDown', { name: item.label })} onClick={() => onMove(index + 1)}><ArrowDown aria-hidden="true" className="size-3.5" /></Button>
        </div>
      </div>
      {children && <div className="ms-5 border-s border-border px-2 pb-2 sm:ms-7 sm:px-3 sm:pb-3">{children}</div>}
    </li>
  );
}

function SidebarList({ items, disabled, visibility, onChange }: {
  items: GatedNavItem[]; disabled: boolean; visibility: (item: GatedNavItem) => RowVisibility; onChange: (items: GatedNavItem[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const move = (from: number, to: number) => {
    if (!disabled && from >= 0 && to >= 0 && to < items.length && from !== to) onChange(arrayMove(items, from, to));
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) move(items.findIndex((item) => item.id === active.id), items.findIndex((item) => item.id === over.id));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2">
          {items.map((item, index) => (
            <SortableSidebarRow key={item.id} item={item} index={index} count={items.length} disabled={disabled}
              visibility={visibility(item)} onMove={(to) => move(index, to)}>
              {item.children && <SidebarList items={item.children} disabled={disabled} visibility={visibility}
                onChange={(children) => onChange(items.map((entry) => entry.id === item.id ? { ...entry, children } : entry))} />}
            </SortableSidebarRow>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

export default function RoleSidebarEditor({ items, order, visibleKeys, eligibility, viewer, locked, saving, dirty, onOrderChange, onVisibilityChange, onSave }: Props) {
  const { t } = useTranslation();
  const ordered = orderSidebarItems(items, order);
  const visibility = (item: GatedNavItem): RowVisibility => {
    const leaves = (entries: GatedNavItem[]): GatedNavItem[] => entries.flatMap((entry) => entry.children ? leaves(entry.children) : [entry]);
    const keys = [...new Set(leaves([item]).filter((leaf) => eligibility.get(leaf.id)).map((leaf) => sidebarKeyForItem(leaf.id)).filter((key): key is SidebarKey => !!key))];
    const checked = keys.filter((key) => visibleKeys.has(key) || viewer.can(sidebarPermission(key))).length;
    const editable = keys.filter((key) => !viewer.can(sidebarPermission(key)));
    return {
      checked: keys.length > 0 && checked === keys.length ? true : checked ? 'indeterminate' : false,
      disabled: locked || saving || !editable.length,
      eligible: keys.length > 0,
      toggle: (visible) => onVisibilityChange(editable, visible),
    };
  };
  const settings = visibility({ id: 'settings:preferences', label: t('navigation.settings') });
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">{t('roleAccess.layout.help')}</p>
      <SidebarList items={ordered} disabled={saving} visibility={visibility} onChange={(items) => onOrderChange(sidebarItemIds(items))} />
      <div className={cn('flex items-center gap-3 rounded-lg bg-muted/30 p-3', surfaceBorderClasses())}>
        <Checkbox checked={settings.checked} disabled={settings.disabled} aria-label={`${t('navigation.settings')}: ${t('roleAccess.sidebar')}`} onCheckedChange={(checked) => settings.toggle(checked === true)} />
        <Settings aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <div><p className="text-sm font-medium">{t('navigation.settings')}</p><p className="mt-0.5 text-xs text-muted-foreground">{t('roleAccess.layout.footer')}</p></div>
      </div>
      <div className={cn('sticky bottom-0 flex flex-wrap items-center justify-between gap-2 bg-background py-3 pe-14', surfaceBorderClasses(true, 'top'))}>
        <Button variant="outline" leftIcon={RotateCcw} disabled={saving || !order.length} onClick={() => onOrderChange([])}>{t('roleAccess.layout.reset')}</Button>
        <Button leftIcon={Save} disabled={saving || !dirty} onClick={onSave}>{t('common.save')}</Button>
      </div>
    </div>
  );
}
