import { EntityDsIdentifier } from "../../dataspecer/entity-model";

/**
 * Identifier generator for the operation execution context.
 *
 * @deprecated Use createCmeEntityIdentifier from the operation folder.
 */
export function createNewEntityIdentifier(): EntityDsIdentifier {
  return crypto.randomUUID();
}
