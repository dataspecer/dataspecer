import { EntityDsIdentifier } from "../../dataspecer/entity-model";

/**
 * Identifier generator for the operation execution context.
 *
 */
export function createNewEntityIdentifier(): EntityDsIdentifier {
  return crypto.randomUUID();
}
