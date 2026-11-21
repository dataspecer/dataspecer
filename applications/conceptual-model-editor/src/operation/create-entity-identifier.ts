import { EntityDsIdentifier } from "../dataspecer/entity-model";

/**
 * Default identifier generator for {@link CmeOperationExecutorState}.
 */
export function createCmeEntityIdentifier(): EntityDsIdentifier {
  return crypto.randomUUID();
}
