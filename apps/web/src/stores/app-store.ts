import { create } from "zustand"

type AppStore = {
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
