import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { DataspecerError } from "../../dataspecer-error";
import { CmeReference } from "../model";
import { EntityDsIdentifier } from "../../entity-model";

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws DataspecerError
 */
export function removeCmeControlledVocabularyAssignment(
  model: InMemorySemanticModel,
  classProfile: CmeReference,
  controlledVocabularyIdentifier: EntityDsIdentifier,
) {
  const operation = factory.removeControlledVocabularyAssignment(
    classProfile.identifier, controlledVocabularyIdentifier);

  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerError("Operation execution failed.");
  }
}
