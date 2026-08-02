import { type ReactNode } from "react"
import { BrowserRouter } from "react-router"
import { QueryProvider } from "./query-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/toaster"

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
