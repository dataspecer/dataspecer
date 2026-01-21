import { createContext, useContext, useEffect, useState } from "react";

export type UiLanguage = "en" | "cs";

type UiLanguageProviderProps = {
  children: React.ReactNode;
  defaultLanguage?: UiLanguage;
  storageKey?: string;
};

type UiLanguageProviderState = {
  uiLanguage: UiLanguage;
  setUiLanguage: (language: UiLanguage) => void;
};

const initialState: UiLanguageProviderState = {
  uiLanguage: "en",
  setUiLanguage: () => null,
};

const UiLanguageProviderContext = createContext<UiLanguageProviderState>(initialState);

export function UiLanguageProvider({
  children,
  defaultLanguage = "en",
  storageKey = "dataspecer-cme-ui-language",
  ...props
}: UiLanguageProviderProps) {
  const [uiLanguage, setUiLanguageState] = useState<UiLanguage>(
    () => (localStorage.getItem(storageKey) as UiLanguage) || defaultLanguage
  );

  useEffect(() => {
    // Store language in localStorage when it changes
    localStorage.setItem(storageKey, uiLanguage);
  }, [uiLanguage, storageKey]);

  const value = {
    uiLanguage,
    setUiLanguage: (language: UiLanguage) => {
      setUiLanguageState(language);
    },
  };

  return (
    <UiLanguageProviderContext.Provider {...props} value={value}>
      {children}
    </UiLanguageProviderContext.Provider>
  );
}

export const useUiLanguage = () => {
  const context = useContext(UiLanguageProviderContext);

  if (context === undefined) {
    throw new Error("useUiLanguage must be used within a UiLanguageProvider");
  }

  return context;
};
