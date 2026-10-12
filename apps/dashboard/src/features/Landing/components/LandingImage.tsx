'use client';
import Image from 'next/image';
import { useNThemeBranding } from 'najm-theme/react';
import { useState } from 'react';
import { useTranslation } from 'najm-i18n/react';

export function LandingImage({ slot, fallback, alt, sizes, hero = false, width = 1440, height = 1080, showDisclosure = true }:
  { slot?: string; fallback: string; alt: string; sizes: string; hero?: boolean; width?: number; height?: number; showDisclosure?: boolean }) {
  const { slots } = useNThemeBranding();
  const { t } = useTranslation();
  const candidate = slot ? slots[slot] ?? fallback : fallback;
  const [failed, setFailed] = useState<string[]>([]);
  const source = failed.includes(candidate) ? fallback : candidate;
  return <figure className="landing-photo">
    {failed.includes(source) ? <div role="img" aria-label={alt} className="landing-photo-placeholder" /> :
      <Image src={source} alt={alt} width={width} height={height} sizes={sizes}
        loading={hero ? 'eager' : 'lazy'} fetchPriority={hero ? 'high' : 'auto'}
        onError={() => setFailed(previous => [...previous, source])} />}
    {showDisclosure && source === fallback && <figcaption>{t('landing.photoDisclosure')}</figcaption>}
  </figure>;
}
