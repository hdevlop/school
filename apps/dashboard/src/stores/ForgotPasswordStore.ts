import { create } from 'zustand'

interface ForgotPasswordStore {
  isOpen: boolean
  openDialog: () => void
  closeDialog: () => void
}

export const useForgotPasswordStore = create<ForgotPasswordStore>((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
}))