import { create } from "zustand"

type BoardColumn = { key: string; title: string }

type BoardStore = {
  selectedOrgId: string | null
  setSelectedOrgId: (orgId: string | null) => void
  columns: BoardColumn[]
  setColumns: (columns: BoardColumn[]) => void
  closedRailCollapsed: boolean
  toggleClosedRail: () => void
  activeCardId: string | null
  setActiveCardId: (cardId: string | null) => void
  promptHistory: string[]
  addPrompt: (prompt: string) => void
}

export const useBoardStore = create<BoardStore>((set) => ({
  selectedOrgId: null,
  setSelectedOrgId: (orgId) => set({ selectedOrgId: orgId }),
  columns: [
    { key: "backlog", title: "Backlog" },
    { key: "todo", title: "To Do" },
    { key: "in_progress", title: "In Progress" },
    { key: "review", title: "Review" },
    { key: "done", title: "Done" },
  ],
  setColumns: (columns) => set({ columns }),
  closedRailCollapsed: false,
  toggleClosedRail: () =>
    set((state) => ({ closedRailCollapsed: !state.closedRailCollapsed })),
  activeCardId: null,
  setActiveCardId: (cardId) => set({ activeCardId: cardId }),
  promptHistory: [],
  addPrompt: (prompt) =>
    set((state) => ({ promptHistory: [...state.promptHistory, prompt] })),
}))
