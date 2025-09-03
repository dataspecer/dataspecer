import { CmeProfileRelationship } from "../../cme-profile-model/model";
import { CmeProfileRelationshipAggregate } from "../model";

export function toCmeProfileRelationshipAggregate(
  next: CmeProfileRelationship,
  previous: CmeProfileRelationshipAggregate | undefined,
): CmeProfileRelationshipAggregate {
  if (previous === undefined) {
    return {
      type: "cme-profile-relationship-aggregate",
      identifier: next.identifier,
      dependencies: [next.identifier],
      profileModels: [next.model],
      iri: next.iri,
      name: next.name,
      nameSource: next.nameSource,
      nameAggregate: null, // We compute this later.
      description: next.description,
      descriptionSource: next.descriptionSource,
      descriptionAggregate: null, // We compute this later.
      usageNote: next.usageNote,
      usageNoteSource: next.usageNoteSource,
      usageNoteAggregate: null, // We compute this later.
      profiling: next.profiling,
      tags: next.tags,
      externalDocumentationUrl: next.externalDocumentationUrl,
      readOnly: next.readOnly,
      domain: next.domain,
      domainCardinality: next.domainCardinality,
      range: next.range,
      rangeCardinality: next.rangeCardinality,
    };
  } else {
    return {
      type: "cme-profile-relationship-aggregate",
      identifier: next.identifier,
      dependencies: [next.identifier, ...previous.dependencies],
      profileModels: [next.model, ...previous.profileModels],
      iri: next.iri,
      name: next.name ?? previous.name,
      nameSource: next.nameSource ?? previous.nameSource,
      nameAggregate: null, // We compute this later.
      description: next.description ?? previous.description,
      descriptionSource: next.descriptionSource ?? previous.descriptionSource,
      descriptionAggregate: null, // We compute this later.
      usageNote: next.usageNote ?? previous.usageNote,
      usageNoteSource: next.usageNoteSource ?? previous.usageNoteSource,
      usageNoteAggregate: null, // We compute this later.
      profiling: [...previous.profiling, ...next.profiling],
      tags: [...next.tags, ...previous.tags],
      externalDocumentationUrl:
        next.externalDocumentationUrl ?? previous.externalDocumentationUrl,
      readOnly: next.readOnly || previous.readOnly,
      domain: next.domain ?? previous.domain,
      domainCardinality:
        next.domainCardinality ?? previous.domainCardinality,
      range: next.range ?? previous.range,
      rangeCardinality:
        next.rangeCardinality ?? previous.rangeCardinality,
    };
  }
}
