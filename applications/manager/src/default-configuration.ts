import type { RawConfigurationData } from "@dataspecer/core-v2/configuration-model";
import { createContext, createElement, useEffect, useState, type ReactNode } from "react";

export const DefaultConfigurationContext = createContext<RawConfigurationData | null>(null);

export function DefaultConfigurationProvider({ children }: { children: ReactNode }) {
  const [defaultConfiguration, setDefaultConfiguration] = useState<RawConfigurationData | null>(null);

  useEffect(() => {
    (async () => {
      const response = await fetch(import.meta.env.VITE_BACKEND + '/default-configuration');
      if (!response.ok) {
        throw new Error(`Failed to load default configuration: ${response.status}`);
      }
      const configuration: RawConfigurationData = await response.json();
      setDefaultConfiguration(configuration);
    })();
  }, []);

  return createElement(DefaultConfigurationContext.Provider, { value: defaultConfiguration }, children);
}
