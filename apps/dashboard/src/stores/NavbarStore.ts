// stores/NavbarStore.ts
import { create } from 'zustand';

interface NavbarState {
  isVisible: boolean;
}

interface NavbarActions {
  showNavbar: () => void;
  hideNavbar: () => void;
  toggleNavbar: () => void;
  resetState: () => void;
}

type NavbarStore = NavbarState & NavbarActions;

const useNavbarStore = create<NavbarStore>((set) => ({
  // State
  isVisible: true,

  // Actions
  showNavbar: () => set({ isVisible: true }),
  hideNavbar: () => set({ isVisible: false }),
  toggleNavbar: () => set(state => ({ isVisible: !state.isVisible })),

  // Utility
  resetState: () => set({ isVisible: true }),
}));

export default useNavbarStore;
export type { NavbarState, NavbarActions, NavbarStore };