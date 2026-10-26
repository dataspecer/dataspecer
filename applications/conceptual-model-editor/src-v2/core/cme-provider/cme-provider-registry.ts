import { Logger } from "../../infrastructure/logger";
import { createRegistry } from "../shared/registry";
import { CmeListener, CmeProvider } from "./cme-provider";

export const cmeProvidersRegistry =
  createRegistry<CmeProviderContribution>();

/**
 * A contribution of a provider what listen to changes from the Dataspecer
 * events and produce CME events and state.
 */
interface CmeProviderContribution {

  id: string;

  createCmeProvider: (context: { logger: Logger }) => CmeProvider;

}

export const cmeListenersRegistry =
  createRegistry<CmeListenerSource>();

/**
 * A source of listener components for the CME events.
 */
export interface CmeListenerSource {

  id: string;

  listCmeListener(): CmeListener[];

}
