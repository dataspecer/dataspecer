import { useState, useEffect, useCallback, useMemo } from "react";
import type { Screen } from "../App";

/** Hash of every screen. A `:name` segment is a parameter of the route. */
const SCREEN_TO_HASH: Record<Screen, string> = {
  "list": "#/",
  "source-selection": "#/source-selection",
  "search": "#/search",
  "form-prefilled": "#/form-prefilled",
  "form-empty": "#/form-empty",
  "view": "#/view",
  "edit": "#/edit/:id",
};

/** Parameters of the screens that have any. */
interface ScreenParams {
  edit: { id: string };
}

type RouteParams = Record<string, string>;

interface ParsedRoute {
  screen: Screen;
  params: RouteParams;
}

const PARAMETER = /:(\w+)/g;

const ROUTE_MATCHERS = (Object.entries(SCREEN_TO_HASH) as [Screen, string][]).map(([screen, template]) => ({
  screen,
  names: [...template.matchAll(PARAMETER)].map((match) => match[1]),
  pattern: new RegExp("^" + template.replace(PARAMETER, "([^/]+)") + "$"),
}));

function parseHash(hash: string): ParsedRoute {
  for (const { screen, names, pattern } of ROUTE_MATCHERS) {
    const match = pattern.exec(hash);
    if (match) {
      const params = Object.fromEntries(names.map((name, i) => [name, decodeURIComponent(match[i + 1])]));
      return { screen, params };
    }
  }
  return { screen: "list", params: {} };
}

function buildHash(screen: Screen, params: RouteParams): string {
  return SCREEN_TO_HASH[screen].replace(PARAMETER, (_, name) => encodeURIComponent(params[name]));
}

interface NavigateOptions {
  replace?: boolean;
}

/**
 * Moves to a screen, passing the parameters the screen requires, if any. With
 * `replace`, the screen takes the place of the current one in the browser
 * history, so that Back does not return to it.
 */
export type Navigate = <S extends Screen>(
  screen: S,
  ...args: S extends keyof ScreenParams
    ? [params: ScreenParams[S], options?: NavigateOptions]
    : [options?: NavigateOptions]
) => void

export function useHashRoute(): [Screen, Navigate, RouteParams] {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  const { screen, params } = useMemo(() => parseHash(hash), [hash]);

  useEffect(() => {
    function onHashChange() {
      setHash(window.location.hash);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate: Navigate = useCallback((target, ...args) => {
    const hasParams = SCREEN_TO_HASH[target].includes(":");
    const [params, options] = (hasParams ? args : [{}, args[0]]) as [RouteParams, NavigateOptions | undefined];
    const targetHash = buildHash(target, params);
    if (options?.replace) {
      window.location.replace(targetHash);
    } else {
      window.location.hash = targetHash;
    }
  }, []);

  return [screen, navigate, params];
}
