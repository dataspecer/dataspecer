import { CoreOperation } from "@dataspecer/core/core";
import { FederatedObservableStore } from "./federated-observable-store.ts";

/**
 * Associates multiple {@link CoreOperation} into one component operation.
 *
 * Grouping of operations can be used to batching updates and to rollback stores
 * if the operation fails. It is expected, that the execute method is called at
 * most once for every instance.
 */
export interface ComplexOperation {
  setStore(store: FederatedObservableStore): void;
  execute(): void;
}
