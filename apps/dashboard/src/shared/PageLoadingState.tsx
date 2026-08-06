"use client";

import { NLoadingState } from 'najm-kit';
import { cn } from '@/lib/utils';

interface PageLoadingStateProps {
  label?: string;
  className?: string;
  fullScreen?: boolean;
}

export default function PageLoadingState({
  label = 'Loading...',
  className,
  fullScreen = false,
}: PageLoadingStateProps) {
  return (
    <NLoadingState
      label={label}
      fullScreen={fullScreen}
      spinnerSize={56}
      className={cn('text-primary [&_p]:text-primary', className)}
    />
  );
}

export const renderPageLoadingState = (
  label = 'Loading...',
  className = 'min-h-64',
) => function RenderPageLoadingState() {
  return <PageLoadingState label={label} className={className} />;
};
