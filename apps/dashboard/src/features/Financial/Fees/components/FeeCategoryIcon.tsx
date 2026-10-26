'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';

const categoryImages: Record<string, string> = {
  tuition: 'tuition',
  registration: 'registration',
  books: 'books-materials',
  sports: 'sports',
  uniform: 'uniform',
  technology: 'technology',
  fieldtrip: 'field-trip-excursion',
  cafeteria: 'cafeteria',
  childcare: 'childcare',
  meal: 'cafeteria',
  transport: 'transportation',
  transportation: 'transportation',
};

interface FeeCategoryIconProps {
  image?: string | null;
  category?: string | null;
  fallback?: ReactNode;
  size?: number;
}

export default function FeeCategoryIcon({ image, category, fallback = '$', size = 40 }: FeeCategoryIconProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const categoryImage = categoryImages[category?.toLowerCase().replace(/[\s_-]/g, '') ?? ''];
  const customImage = image && image !== failedImage ? image : null;
  const src = customImage || (categoryImage ? `/images/fee-types/${categoryImage}.png` : null);

  if (!src) {
    return <span aria-hidden="true">{fallback}</span>;
  }

  // Custom images use the session-protected route directly in the browser.
  return (
    <Image
      src={src}
      unoptimized={Boolean(customImage)}
      onError={customImage ? () => setFailedImage(customImage) : undefined}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
    />
  );
}
