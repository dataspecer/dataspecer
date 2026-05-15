import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { CmeRelationshipProfile } from "../model/cme-relationship-profile";
import { DataspecerError } from "../../dataspecer-error";
import { emptyAsNull } from "../../../utilities/string";

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws DataspecerError
 */
export function updateCmeRelationshipProfile(
  model: InMemorySemanticModel,
  next: CmeRelationshipProfile,
) {
  const tags: string[] = [];
  if (next.mandatoryLevel !== null) {
    tags.push(next.mandatoryLevel);
  }

  const operation = factory.modifyRelationshipProfile(next.identifier, {
    ends: [{
      profiling: [],
      iri: null,
      name: null,
      nameFromProfiled: null,
      description: null,
      descriptionFromProfiled: null,
      usageNote: null,
      usageNoteFromProfiled: null,
      concept: next.domain,
      cardinality: next.domainCardinality,
      externalDocumentationUrl: null,
      tags: [],
    }, {
      profiling: next.profileOf,
      iri: next.iri,
      name: next.name,
      nameFromProfiled: next.nameSource,
      description: next.description,
      descriptionFromProfiled: next.descriptionSource,
      usageNote: next.usageNote,
      usageNoteFromProfiled: next.usageNoteSource,
      concept: next.range,
      cardinality: next.rangeCardinality,
      externalDocumentationUrl: emptyAsNull(next.externalDocumentationUrl),
      tags,
      order: next.order,
    }]
  })

  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerError("Operation execution failed.");
  }
}
