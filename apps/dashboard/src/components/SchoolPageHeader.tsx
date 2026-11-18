'use client';

import { Children, cloneElement, Fragment, isValidElement, type ComponentProps, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  cn, NButton, NPageHeader, NPageHeaderActions, NPageHeaderCompactActions,
} from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { HeaderActionsMenu } from './HeaderActionsMenu';
import styles from './SchoolPageHeader.module.css';
import { useFeatureActions } from '@/shared/FeatureActions';
import { SCHOOL_HOME_PATH } from '@/najm.config';

type HeaderProps = ComponentProps<typeof NPageHeader> & {
  mobileActions?: ReactNode;
  /** Phones return directly to Home by default; opt out for a custom navigation control. */
  mobileBack?: boolean;
  /** Where the phone back arrow goes instead of Home, for a screen opened from another. */
  onBack?: () => void;
  backLabel?: string;
};
type ActionsProps = ComponentProps<typeof NPageHeaderActions>;

function MobileBackButton({ onBack, label }: { onBack?: () => void; label?: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const name = label ?? t('mobileHome.title');
  return (
    <NButton type="button" variant="ghost" size="icon" className="absolute start-2 top-1.5 z-10 h-11 w-9 md:hidden"
      data-slot="page-header-back" onClick={onBack ?? (() => router.push(SCHOOL_HOME_PATH))} aria-label={name} title={name}>
      <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
    </NButton>
  );
}

/**
 * Whether the actions hold anything but the global controls, which the phone
 * menu leaves out: alone, they would open an empty menu.
 */
function hasPageActions(node: ReactNode): boolean {
  return Children.toArray(node).some((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return true;
    // Flagged rather than imported: the header stays free of alerts and year code.
    if ((child.type as { globalActions?: boolean }).globalActions) return false;
    if (child.type === NPageHeaderActions || child.type === Fragment) return hasPageActions(child.props.children);
    return true;
  });
}

/** Keeps every page's existing actions together behind one control on phones. */
export function SchoolPageHeader({ mobileActions, mobileBack = true, onBack, backLabel, ...props }: HeaderProps) {
  const featureActions = useFeatureActions();
  const children = Children.toArray(props.children);
  const actionSlots = children.filter((child) => isValidElement<ActionsProps>(child) && child.type === NPageHeaderActions);
  const hasCompactSlot = children.some((child) => isValidElement(child) && child.type === NPageHeaderCompactActions);
  const actions = actionSlots.length ? actionSlots.map((child) => isValidElement<ActionsProps>(child)
    ? cloneElement(child, { className: cn(child.props.className, 'max-w-full flex-wrap gap-2') })
    : child) : props.actions;
  const headerProps = {
    ...props,
    className: cn(styles.header, mobileBack && styles.withBack, props.className),
    top: mobileBack ? <><MobileBackButton onBack={onBack} label={backLabel} />{props.top}</> : props.top,
  };

  // A page that supplies its own compact controls retains that arrangement.
  if ((!actions && !mobileActions && !featureActions) || props.compactActions || hasCompactSlot) return <NPageHeader {...headerProps} />;

  return (
    <NPageHeader
      {...headerProps}
      compactActions={
        <>
          <HeaderActionsMenu contentClassName="md:hidden" hasOwnActions={hasPageActions(mobileActions) || hasPageActions(actions)}>
            {mobileActions}{actions}
          </HeaderActionsMenu>
        </>
      }
    />
  );
}
