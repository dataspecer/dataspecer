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

export function ConfigProvider({
  children,
  managerUrl = import.meta.env.VITE_MANAGER,
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
