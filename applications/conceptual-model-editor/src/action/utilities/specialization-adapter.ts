import { cmeOperations } from "../../operation";
import {
  isCmeSpecialization,
  NewCmeSpecialization,
} from "../../dataspecer/cme-model/model";

type Specialization =
  Parameters<typeof cmeOperations.updateSpecialization.create>[1]["next"][number];

/**
 * Convert specializations from a dialog state to the
 * {@link cmeOperations.updateSpecialization} arguments.
 */
export function dialogSpecializationsToOperation(
  items: NewCmeSpecialization[],
): Specialization[] {
  return items.map(item => ({
    iri: item.iri,
    specializationOf: item.specializationOf.identifier,
    generalization: isCmeSpecialization(item) ? {
      identifier: item.generalization.identifier,
      model: item.generalization.model,
    } : null,
  }));
}
