import { useEffect } from "react";
import { useUiLanguage } from "./ui-language-provider";
import { setUiLanguage } from "./localization";

/**
 * This component synchronizes the UI language context with the localization system.
 * It ensures that when the user changes the UI language, the translation function
 * uses the correct language.
 */
export function UiLanguageSynchronizer({ children }: { children: React.ReactNode }) {
  const { uiLanguage } = useUiLanguage();

  useEffect(() => {
    setUiLanguage(uiLanguage);
    // Force re-render of the entire app by dispatching a custom event
    window.dispatchEvent(new CustomEvent("ui-language-changed"));
  }, [uiLanguage]);

  return <>{children}</>;
}
