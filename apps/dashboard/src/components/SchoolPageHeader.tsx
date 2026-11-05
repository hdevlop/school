'use client';

import { Children, cloneElement, isValidElement, type ComponentProps, type ReactNode } from 'react';
import {
  cn, NPageHeader, NPageHeaderActions, NPageHeaderCompactActions,
} from 'najm-kit';
import { HeaderActionsMenu } from './HeaderActionsMenu';
import styles from './SchoolPageHeader.module.css';
import { useFeatureActions } from '@/shared/FeatureActions';

type HeaderProps = ComponentProps<typeof NPageHeader> & { mobileActions?: ReactNode };
type ActionsProps = ComponentProps<typeof NPageHeaderActions>;

/** Keeps every page's existing actions together behind one control on phones. */
export function SchoolPageHeader({ mobileActions, ...props }: HeaderProps) {
  const featureActions = useFeatureActions();
  const children = Children.toArray(props.children);
  const actionSlots = children.filter((child) => isValidElement<ActionsProps>(child) && child.type === NPageHeaderActions);
  const hasCompactSlot = children.some((child) => isValidElement(child) && child.type === NPageHeaderCompactActions);
  const actions = actionSlots.length ? actionSlots.map((child) => isValidElement<ActionsProps>(child)
    ? cloneElement(child, { className: cn(child.props.className, 'max-w-full flex-wrap gap-2') })
    : child) : props.actions;

  // A page that supplies its own compact controls retains that arrangement.
  if ((!actions && !mobileActions && !featureActions) || props.compactActions || hasCompactSlot) return <NPageHeader {...props} className={cn(styles.header, props.className)} />;

  return (
    <NPageHeader
      {...props}
      className={cn(styles.header, props.className)}
      compactActions={
        <>
          <HeaderActionsMenu contentClassName="md:hidden">{mobileActions}{actions}</HeaderActionsMenu>
        </>
      }
    />
  );
}
