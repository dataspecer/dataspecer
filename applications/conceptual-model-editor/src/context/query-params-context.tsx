import React, { type ReactNode, useCallback, useContext, useEffect, useState } from "react";

export type QueryParamsContextType = {
    packageId: string | null;
    viewId: string | null;
    updatePackageId: (p: string | null) => void;
    updateViewId: (v: string | null) => void;
};

export const QueryParamsContext = React.createContext<QueryParamsContextType>(
    null as unknown as QueryParamsContextType
);

const PACKAGE_ID = "package-id";

const VIEW_ID = "view-id";

export const QueryParamsProvider = (props: { children: ReactNode }) => {

  const searchParams = new URLSearchParams(window.location.search);

  const [packageId, setPackageId] = useState<string | null>(searchParams.get(PACKAGE_ID));
  const [viewId, setViewId] = useState<string | null>(searchParams.get(VIEW_ID));

  useEffect(() => {
    const initialPackageId = searchParams.get(PACKAGE_ID);
    const initialViewId = searchParams.get(VIEW_ID);
    setPackageId(initialPackageId ?? null);
    setViewId(initialViewId ?? null);
  }, [searchParams]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentSearchParams = new URLSearchParams(window.location.search);
      const currentPackageId = currentSearchParams.get(PACKAGE_ID);
      const currentViewId = currentSearchParams.get(VIEW_ID);
      setPackageId(currentPackageId ?? null);
      setViewId(currentViewId ?? null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const setQueryParams = useCallback(
    (params: Partial<{ [PACKAGE_ID]: string | null; [VIEW_ID]: string | null }>) => {
      const stateAsParams: Record<string, string> = {};
      if (packageId !== null) {
        stateAsParams[PACKAGE_ID] = packageId;
      }
      if (viewId !== null) {
        stateAsParams[VIEW_ID] = viewId;
      }
      const urlSearchParams = new URLSearchParams(stateAsParams);
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          urlSearchParams.delete(key);
        } else {
          urlSearchParams.set(key, String(value));
        }
      });
      // Change URL.
      const search = urlSearchParams.toString();
      const query = search ? `?${search}` : "";
      console.log("setQueryParams", params, "=>", { query });
      window.history.pushState({}, "", query);
    },
    [packageId, viewId]
  );

  const updatePackageId = (pId: string | null) => {
    setPackageId(pId);
    setQueryParams({ [PACKAGE_ID]: pId });
  };

  const updateViewId = (vId: string | null) => {
    setViewId(vId);
    setQueryParams({ [VIEW_ID]: vId });
  };

  return (
    <QueryParamsContext.Provider value={{ packageId, viewId, updatePackageId, updateViewId }}>
      {props.children}
    </QueryParamsContext.Provider>
  );
};

/**
 * Provides functionality to work with query parameters
 */
export const useQueryParamsContext = (): QueryParamsContextType => {
  const context = useContext(QueryParamsContext);
  if (context === undefined) {
    throw new Error("useQueryParams must be used within a QueryParamsProvider");
  }
  return context;
};
