import { createContext } from "react";
import type { EntityObservableModelStore } from "../interfaces/observable.ts";

/**
 * React context providing access to the model store. Must be set by the
 * consuming application, e.g. `<ModelStoreContext.Provider value={store}>`.
 */
export const ModelStoreContext = createContext<EntityObservableModelStore | null>(null);
