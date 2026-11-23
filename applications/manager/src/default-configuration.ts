import type { Configuration } from "@dataspecer/core/configuration";
import { createContext, createElement, useEffect, useState, type ReactNode } from "react";

export const DefaultConfigurationContext = createContext<Configuration | null>(null);

export function DefaultConfigurationProvider({ children }: { children: ReactNode }) {
  const [defaultConfiguration, setDefaultConfiguration] = useState<Configuration | null>(null);

  useEffect(() => {
    (async () => {
      const response = await fetch(import.meta.env.VITE_BACKEND + '/default-configuration');
      if (!response.ok) {
        throw new Error(`Failed to load default configuration: ${response.status}`);
      }
      const configuration: Configuration = await response.json();
      setDefaultConfiguration(configuration);
    })();
  }, []);

  return createElement(DefaultConfigurationContext.Provider, { value: defaultConfiguration }, children);
}
