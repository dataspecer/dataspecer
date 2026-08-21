import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import { ControlledVocabularyAssignment } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { DataspecerError } from "../../dataspecer-error";
import { CmeReference } from "../model";

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws DataspecerError
 */
export function addCmeControlledVocabularyAssignment(
  model: InMemorySemanticModel,
  classProfile: CmeReference,
  assignment: ControlledVocabularyAssignment,
) {
  const operation = factory.addControlledVocabularyAssignment(
    classProfile.identifier, assignment);

  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerError("Operation execution failed.");
  }
}
