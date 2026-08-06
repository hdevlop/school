// stores/SidebarStore.ts
import { create } from 'zustand';

interface SidebarState {
  isExpanded: boolean;
  isMobileMenuOpen: boolean;
}

interface SidebarActions {
  toggleSidebar: () => void;
  expandSidebar: () => void;
  collapseSidebar: () => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
  resetState: () => void;
}

type SidebarStore = SidebarState & SidebarActions;

const useSidebarStore = create<SidebarStore>((set) => ({
  // State
  isExpanded: true,
  isMobileMenuOpen: false,

  // Desktop Actions
  toggleSidebar: () => set(state => ({ isExpanded: !state.isExpanded })),
  expandSidebar: () => set({ isExpanded: true }),
  collapseSidebar: () => set({ isExpanded: false }),

  // Mobile Actions  
  openMobileMenu: () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  toggleMobileMenu: () => set(state => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

  // Utility
  resetState: () => set({ isExpanded: true, isMobileMenuOpen: false }),
}));

export default useSidebarStore;
export type { SidebarState, SidebarActions, SidebarStore };