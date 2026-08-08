/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  disableTransitionOnChange?: boolean
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = React.createContext<
  ThemeProviderState | undefined
>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "theme",
  ...props
}: ThemeProviderProps) {
  const [theme] = React.useState<Theme>(defaultTheme)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setTheme = React.useCallback((_nextTheme: Theme) => {
    // Design is dark-only; theme switching is intentionally disabled.
  }, [])

  React.useEffect(() => {
    document.documentElement.classList.add("dark")
  }, [])

  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, "dark")
    } catch {
      // ignore quota/security errors
    }
  }, [storageKey])

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
