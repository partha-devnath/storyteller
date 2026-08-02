import { create } from "zustand"

export type ToastKind = "success" | "error"
export type ToastItem = { id: number; kind: ToastKind; message: string }

type ToastState = {
  toasts: ToastItem[]
  push: (kind: ToastKind, message: string) => void
  dismiss: (id: number) => void
}

const TOAST_DURATION_MS = 4000

let nextId = 1

/**
 * Minimal local toast store (zustand — repo global-state convention).
 * Module-level `toast` singleton so plain functions (e.g. handleLimitError
 * in use-billing) can fire toasts without a React hook. `useToast()` mirrors
 * the same API for components. No external toast dependency — threat model
 * T-03-SC forbids installs in this plan.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, TOAST_DURATION_MS)
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (message: string) =>
    useToastStore.getState().push("success", message),
  error: (message: string) => useToastStore.getState().push("error", message),
}

export function useToast() {
  return { toast }
}
