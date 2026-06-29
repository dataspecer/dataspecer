import { createContext, useContext, type ReactNode } from "react"

interface ConfigContextValue {
  managerUrl: string
  backendUrl: string
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined)

interface ConfigProviderProps {
  children: ReactNode
  managerUrl?: string
  backendUrl?: string
}

function deriveManagerUrl(): string {
  const { origin, pathname } = window.location;
  const base = pathname.replace(/\/controlled-vocab-manager(\/.*)?$/, "");
  return origin + (base || "/");
}

export function ConfigProvider({
  children,
  managerUrl = import.meta.env.VITE_MANAGER ?? deriveManagerUrl(),
  backendUrl = import.meta.env.VITE_BACKEND,
}: ConfigProviderProps) {
  return (
    <ConfigContext.Provider value={{ managerUrl, backendUrl }}>
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
