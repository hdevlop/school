'use client';
import React from 'react';
type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string | { src: string; width?: number; height?: number }; fill?: boolean; priority?: boolean; quality?: number; unoptimized?: boolean; loader?: unknown; placeholder?: unknown; blurDataURL?: string };
export default function Image({ src, fill, priority, quality: _quality, unoptimized: _unoptimized, loader: _loader, placeholder: _placeholder, blurDataURL: _blur, style, ...props }: Props) {
  // Native image loading for public assets; no Next image optimizer offline.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt ?? ''} src={typeof src === 'string' ? src : src.src} loading={priority ? 'eager' : props.loading} style={{ ...(fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const : {}), ...style }} />;
}
