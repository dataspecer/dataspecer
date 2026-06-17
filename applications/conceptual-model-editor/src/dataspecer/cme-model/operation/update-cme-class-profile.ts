import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import { CmeClassProfile } from "../model/cme-class-profile";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { DataspecerError } from "../../dataspecer-error";

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws DataspecerError
 */
export function updateCmeClassProfile(
  model: InMemorySemanticModel,
  next: CmeClassProfile,
) {
  const tags: string[] = [];
  if (next.role !== null) {
    tags.push(next.role);
  }

  const operation = factory.modifyClassProfile(
    next.identifier, {
      iri: next.iri,
      profiling: next.profileOf,
      name: next.name,
      nameFromProfiled: next.nameSource,
      description: next.description,
      descriptionFromProfiled: next.descriptionSource,
      usageNote: next.usageNote,
      usageNoteFromProfiled: next.usageNoteSource,
      externalDocumentationUrl: next.externalDocumentationUrl,
      tags,
      order: next.order,
    });

  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerError("Operation execution failed.");
  }
}
