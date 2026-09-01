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
export function modifyCmeControlledVocabularyAssignment(
  model: InMemorySemanticModel,
  assignment: CmeReference,
  changes: Partial<Pick<ControlledVocabularyAssignment, "qualifier" | "replaces">>,
) {
  const operation = factory.modifyControlledVocabularyAssignment(
    assignment.identifier, changes);

  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerError("Operation execution failed.");
  }
}
