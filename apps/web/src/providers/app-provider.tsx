import { type ReactNode } from "react"
import { BrowserRouter } from "react-router"
import { QueryProvider } from "./query-provider"
import { ThemeProvider } from "@/components/theme-provider"

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <QueryProvider>{children}</QueryProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
