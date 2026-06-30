import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createDSEModelStore, type DefaultFrontendModelStore } from "@dataspecer/model-store/implementation";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";

export interface ModelStoreContextValue {
  modelStore: DefaultFrontendModelStore | null;
  isLoading: boolean;
}

const ModelStoreContext = createContext<ModelStoreContextValue>({
  modelStore: null,
  isLoading: false,
});

export function ModelStoreProvider({ packageIri, children }: { packageIri: string | undefined; children: ReactNode }) {
  const [value, setValue] = useState<ModelStoreContextValue>({ modelStore: null, isLoading: false });

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND as string | undefined;
    if (!packageIri || !backendUrl) {
      setValue({ modelStore: null, isLoading: false });
      return;
    }

    setValue({ modelStore: null, isLoading: true });

    let cancelled = false;
    const store = createDSEModelStore({ projectId: packageIri, backendUrl, httpFetch });

    store.initialize()
      .then(() => store.waitForModelsToLoad())
      .then(() => {
        if (!cancelled) {
          setValue({ modelStore: store, isLoading: false });
          store.subscribeToTransactionCommit(() => store.saveByOverride());
        }
      })
      .catch((error) => {
        console.error("Failed to initialize model store.", error);
        if (!cancelled) setValue({ modelStore: null, isLoading: false });
      });

    return () => { cancelled = true; };
  }, [packageIri]);

  (window as any).store = value.modelStore;

  return <ModelStoreContext.Provider value={value}>{children}</ModelStoreContext.Provider>;
}

export function useModelStore(): ModelStoreContextValue {
  return useContext(ModelStoreContext);
}
