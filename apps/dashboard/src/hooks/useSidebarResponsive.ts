import { useEffect, useState } from 'react';
import useSidebarStore from '@/stores/SidebarStore';
import { useMediaQuery } from 'react-responsive';

export const useIsMobile = () => {
  return useMediaQuery({ maxWidth: 767 });
};

export const useIsTablet = () => {
  return useMediaQuery({ minWidth: 768, maxWidth: 1023 });
};

export const useIsDesktop = () => {
  return useMediaQuery({ minWidth: 1024 });
};

export const useSidebarResponsive = () => {
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  
  const { isMobileMenuOpen, closeMobileMenu } = useSidebarStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isDesktop && isMobileMenuOpen) {
      closeMobileMenu();
    }
  }, [isDesktop, isMobileMenuOpen, closeMobileMenu]);

  const resolvedIsMobile = mounted && isMobile;
  const resolvedIsTablet = mounted && isTablet;
  const resolvedIsDesktop = mounted && isDesktop;

  return {
    isMobile: resolvedIsMobile,
    isTablet: resolvedIsTablet,
    isDesktop: resolvedIsDesktop,
    shouldShowDesktopSidebar: resolvedIsDesktop || resolvedIsTablet,
    shouldShowMobileSidebar: resolvedIsMobile,
  };
};
