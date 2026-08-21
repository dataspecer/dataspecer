import { Logger } from "../../infrastructure/logger";
import { createRegistry } from "../shared/registry";
import { CmeProvider } from "./cme-provider";

export const cmeProvidersRegistry = createRegistry<CmeProviderContribution>();

/**
 * A contribution of a provider what listen to changes from the Dataspecer
 * events and produce CME events and state.
 */
interface CmeProviderContribution {

  id: string;

  create: (context: { logger: Logger }) => CmeProvider;

}
