import { useEffect } from "react";
import { useUiLanguage } from "./ui-language-provider";
import { setUiLanguage } from "./localization";

/**
 * This component synchronizes the UI language context with the localization system
 * and forces a complete re-render by using a key that changes with language.
 */
export function UiLanguageSynchronizer({ children }: { children: React.ReactNode }) {
  const { uiLanguage } = useUiLanguage();

  useEffect(() => {
    setUiLanguage(uiLanguage);
  }, [uiLanguage]);

  // Use the language as a key to force complete remount when it changes
  return <div key={uiLanguage}>{children}</div>;
}
