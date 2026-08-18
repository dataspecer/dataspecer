import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import { ControlledVocabularyAssignment } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { DataspecerError } from "../../dataspecer-error";
import { CmeReference } from "../model";
import { EntityDsIdentifier } from "../../entity-model";

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws DataspecerError
 */
export function modifyCmeControlledVocabularyAssignment(
  model: InMemorySemanticModel,
  classProfile: CmeReference,
  controlledVocabularyIdentifier: EntityDsIdentifier,
  changes: Partial<Pick<ControlledVocabularyAssignment, "qualifier" | "override">>,
) {
  const operation = factory.modifyControlledVocabularyAssignment(
    classProfile.identifier, controlledVocabularyIdentifier, changes);

  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerError("Operation execution failed.");
  }
}
