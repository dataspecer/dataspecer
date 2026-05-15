import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import { NewCmeClassProfile } from "../model/cme-class-profile";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { DataspecerError } from "../../dataspecer-error";
import { CreatedEntityOperationResult } from "@dataspecer/core-v2/semantic-model/operations";

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws DataspecerError
 */
export function createCmeClassProfile(
  model: InMemorySemanticModel,
  value: NewCmeClassProfile,
) {
  const tags: string[] = [];
  if (value.role !== null) {
    tags.push(value.role);
  }

  const operation = factory.createClassProfile({
    iri: value.iri,
    profiling: value.profileOf,
    name: value.name,
    nameFromProfiled: value.nameSource,
    description: value.description,
    descriptionFromProfiled: value.descriptionSource,
    usageNote: value.usageNote,
    usageNoteFromProfiled: value.usageNoteSource,
    externalDocumentationUrl: value.externalDocumentationUrl,
    tags,
    order: value.order,
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
