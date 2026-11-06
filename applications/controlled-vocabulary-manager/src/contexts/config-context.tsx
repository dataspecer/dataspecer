import { createContext, useContext, type ReactNode } from "react"

interface ConfigContextValue {
  /** Where "Package Manager" links go: the page we were opened from, if any. */
  managerUrl: string
  /** Set when opened from the package manager; saving or cancelling returns there. */
  returnTo: string | null
  backendUrl: string
}

/**
 * Reads the `returnTo` query parameter. Only addresses on the package
 * manager's origin are accepted, so the parameter can't be used as an open
 * redirect.
 */
function readReturnTo(managerUrl: string): string | null {
  const value = new URLSearchParams(window.location.search).get("returnTo")
  if (!value) return null
  try {
    const allowedOrigin = new URL(managerUrl || window.location.origin, window.location.origin).origin
    const url = new URL(value, window.location.origin)
    return url.origin === allowedOrigin ? url.href : null
  } catch {
    return null
  }
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined)

interface ConfigProviderProps {
  children: ReactNode
  managerUrl?: string
  backendUrl?: string
}

export function ConfigProvider({
  children,
  managerUrl = import.meta.env.VITE_MANAGER,
  backendUrl = import.meta.env.VITE_BACKEND,
}: ConfigProviderProps) {
  const returnTo = readReturnTo(managerUrl)
  return (
    <ConfigContext.Provider value={{ managerUrl: returnTo ?? managerUrl, returnTo, backendUrl }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const context = useContext(ConfigContext)
  if (context === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider")
  }
  return context
}
