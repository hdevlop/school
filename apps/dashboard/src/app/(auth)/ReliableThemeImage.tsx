'use client';

import React from 'react';
import {
  useNThemeBranding,
  type StandardBrandingSlotKey,
} from 'najm-theme/react';

interface ReliableThemeImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  slot: StandardBrandingSlotKey;
  alt: string;
  fill?: boolean;
}

const fillStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

/**
 * Renders the same resolved branding chain as NThemeImage without its eager
 * mount-time naturalWidth check. Large images can still be loading when React
 * attaches the ref, which must not be treated as a permanent asset failure.
 */
export function ReliableThemeImage({
  slot,
  alt,
  fill,
  style,
  onError,
  ...props
}: Readonly<ReliableThemeImageProps>) {
  const branding = useNThemeBranding();
  const [failed, setFailed] = React.useState<readonly string[]>([]);
  const candidates = [branding.slots[slot], branding.factory[slot]].filter(
    (candidate, index, all): candidate is string =>
      typeof candidate === 'string'
      && candidate.length > 0
      && all.indexOf(candidate) === index,
  );
  const src = candidates.find((candidate) => !failed.includes(candidate));

  if (!src) {
    return null;
  }

  return (
    // A native image intentionally avoids NThemeImage's eager failure ref.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      src={src}
      style={fill ? { ...fillStyle, ...style } : style}
      onError={(event) => {
        setFailed((current) => (
          current.includes(src) ? current : [...current, src]
        ));
        onError?.(event);
      }}
    />
  );
}
