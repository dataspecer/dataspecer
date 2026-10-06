import { useState, useEffect, useCallback } from "react";

export function useUrlQuery() : [
  UrlQuery,
  (value: Partial<UrlQuery>) => void,
] {
  const [params, setParams] = useState(
    () => stringToUrlQuery(window.location.search));

  // Synchronize content of params with the window.location.search.
  const synchronize = useCallback(
    () => setParams(stringToUrlQuery(window.location.search)), []);

  // The popstate only fires on back/forward navigation.
  // It does not fire on pushState / replaceState.
  useEffect(() => {
    window.addEventListener("popstate", synchronize);
    return () => window.removeEventListener("popstate", synchronize);
  }, [synchronize]);

  const setQuery = useCallback((value: Partial<UrlQuery>) => {
    setParams(previous => {
      const next = {...previous, ...value};
      // The pushState / replaceState don't fire popstate themselves.
      window.history.pushState({}, '', urlQueryToString(next));
      // Which is fine as we set the next value here.
      return next;
    });
  }, [setParams]);

  return [params, setQuery];
}

export interface UrlQuery {

  packageId: string | null;

  viewId: string | null;

}

function stringToUrlQuery(value: string) {
  const params = new URLSearchParams(value);
  return {
    packageId: params.get(QUERY_PACKAGE_ID),
    viewId: params.get(QUERY_VIEW_ID),
  };
}

function urlQueryToString(value: UrlQuery): string {
  const params: Record<string, string> = {};
  if (value.packageId !== null) {
    params[QUERY_PACKAGE_ID] = value.packageId;
  }
  if (value.viewId !== null) {
    params[QUERY_VIEW_ID] = value.viewId;
  }
  return "?" + (new URLSearchParams(params)).toString();
}

const QUERY_PACKAGE_ID = "package-id";

const QUERY_VIEW_ID = "view-id";
