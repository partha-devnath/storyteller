import { describe, it, expect } from "vitest"

describe("useAppStore", () => {
  it("has sidebarOpen false by default", async () => {
    const { useAppStore } = await import("../app-store")
    expect(useAppStore.getState().sidebarOpen).toBe(false)
  })

  it("toggleSidebar flips sidebarOpen", async () => {
    const { useAppStore } = await import("../app-store")
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(true)
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(false)
  })
})
