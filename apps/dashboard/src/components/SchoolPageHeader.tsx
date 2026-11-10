'use client';

import { Children, cloneElement, isValidElement, type ComponentProps, type ReactNode } from 'react';
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
};
type ActionsProps = ComponentProps<typeof NPageHeaderActions>;

function MobileBackButton() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <NButton type="button" variant="ghost" size="icon" className="absolute start-2 top-1.5 z-10 h-11 w-9 md:hidden"
      data-slot="page-header-back" onClick={() => router.push(SCHOOL_HOME_PATH)} aria-label={t('mobileHome.title')} title={t('mobileHome.title')}>
      <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
    </NButton>
  );
}

/** Keeps every page's existing actions together behind one control on phones. */
export function SchoolPageHeader({ mobileActions, mobileBack = true, ...props }: HeaderProps) {
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
    top: mobileBack ? <><MobileBackButton />{props.top}</> : props.top,
  };

  // A page that supplies its own compact controls retains that arrangement.
  if ((!actions && !mobileActions && !featureActions) || props.compactActions || hasCompactSlot) return <NPageHeader {...headerProps} />;

  return (
    <NPageHeader
      {...headerProps}
      compactActions={
        <>
          <HeaderActionsMenu contentClassName="md:hidden">{mobileActions}{actions}</HeaderActionsMenu>
        </>
      }
    />
  );
}
