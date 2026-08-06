'use client';

import { useState, useEffect } from 'react';

export function useDelayedLoading(delay = 1000): boolean {
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return isLoading;
}
