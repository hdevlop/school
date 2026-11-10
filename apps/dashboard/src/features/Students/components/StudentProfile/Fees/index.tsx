'use client';

import { useMediaQuery } from 'najm-kit';
import FeesDesktop from './FeesDesktop';
import FeesMobile, { type FeesTabProps } from './FeesMobile';

/**
 * Below lg (where tables turn into cards) the fees read as cards opening onto
 * their installments; on a wide screen, the totals and a table of fees.
 */
export default function FeesTab(props: FeesTabProps) {
  const isStacked = useMediaQuery('(max-width: 1023px)');
  return isStacked ? <FeesMobile {...props} /> : <FeesDesktop {...props} />;
}
