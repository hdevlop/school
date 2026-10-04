import Image from 'next/image';
import type { ReactNode } from 'react';

const categoryImages: Record<string, string> = {
  tuition: 'tuition',
  registration: 'registration',
  books: 'books-materials',
  sports: 'sports',
  uniform: 'uniform',
  technology: 'technology',
  fieldtrip: 'field-trip-excursion',
  cafeteria: 'cafeteria',
  meal: 'cafeteria',
  transport: 'transportation',
  transportation: 'transportation',
};

interface FeeCategoryIconProps {
  category?: string | null;
  fallback?: ReactNode;
  size?: number;
}

export default function FeeCategoryIcon({ category, fallback = '$', size = 40 }: FeeCategoryIconProps) {
  const image = categoryImages[category?.toLowerCase().replace(/[\s_-]/g, '') ?? ''];

  if (!image) {
    return <span aria-hidden="true">{fallback}</span>;
  }

  return (
    <Image
      src={`/images/fee-types/${image}.png`}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
    />
  );
}
