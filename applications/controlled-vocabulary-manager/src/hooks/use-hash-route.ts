import { useState, useEffect, useCallback } from "react";
import type { Screen } from "../App";

const HASH_TO_SCREEN: Record<string, Screen> = {
  "#/": "list",
  "#/source-selection": "source-selection",
  "#/search": "search",
  "#/form-prefilled": "form-prefilled",
  "#/form-empty": "form-empty",
};

const SCREEN_TO_HASH: Record<Screen, string> = {
  "list": "#/",
  "source-selection": "#/source-selection",
  "search": "#/search",
  "form-prefilled": "#/form-prefilled",
  "form-empty": "#/form-empty",
};

function hashToScreen(hash: string): Screen {
  return HASH_TO_SCREEN[hash] ?? "list";
}

export function useHashRoute(): [Screen, (screen: Screen) => void] {
  const [screen, setScreen] = useState<Screen>(() =>
    hashToScreen(window.location.hash || "#/")
  );

  useEffect(() => {
    function onHashChange() {
      setScreen(hashToScreen(window.location.hash));
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((target: Screen) => {
    window.location.hash = SCREEN_TO_HASH[target];
  }, []);

  return [screen, navigate];
}
