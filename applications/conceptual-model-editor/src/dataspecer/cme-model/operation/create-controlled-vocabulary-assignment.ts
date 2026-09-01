import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import {
  ControlledVocabularyAssignmentReplaces,
  Qualifier,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { CreatedEntityOperationResult } from "@dataspecer/core-v2/semantic-model/operations";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { DataspecerError } from "../../dataspecer-error";
import { CmeReference } from "../model";
import { EntityDsIdentifier } from "../../entity-model";

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws DataspecerError
 */
export function createCmeControlledVocabularyAssignment(
  model: InMemorySemanticModel,
  classProfile: CmeReference,
  assignment: {
    vocabulary: EntityDsIdentifier;
    qualifier: Qualifier;
    replaces: ControlledVocabularyAssignmentReplaces;
  },
): CmeReference {
  const operation = factory.createControlledVocabularyAssignment({
    classProfile: classProfile.identifier,
    vocabulary: assignment.vocabulary,
    qualifier: assignment.qualifier,
    replaces: assignment.replaces,
  });

  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerError("Operation execution failed.");
  }
  return {
    identifier: (result as CreatedEntityOperationResult).id,
    model: model.getId(),
  };
}
