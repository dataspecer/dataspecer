import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model/data-specification-artefact";
import { pathRelative } from "@dataspecer/core/core/utilities/path-relative";
import { dsvMetadataWellKnown, type ResourceDescriptor } from "@dataspecer/data-specification-vocabulary/specification-description";

const ARTIFACT_MAPPING = {
  "http://example.com/generator/json-schema": {
    role: dsvMetadataWellKnown.role.schema,
    conformsTo: [dsvMetadataWellKnown.conformsTo.jsonSchema],
    formatMime: dsvMetadataWellKnown.formatMime.jsonSchema
  },
  "http://dataspecer.com/generator/json-ld": {
    role: dsvMetadataWellKnown.role.schema,
    conformsTo: [dsvMetadataWellKnown.conformsTo.jsonLd],
    formatMime: dsvMetadataWellKnown.formatMime.jsonLd
  }
} as Record<string, Pick<ResourceDescriptor, "role" | "conformsTo" | "formatMime">>;

/**
 * For the given v1 artefact returns a DSV representation of the artefact or
 * null if the representation is not supported and should be skipped.
 */
export function artefactToDsv(artefact: DataSpecificationArtefact, relativeFromPath: string): ResourceDescriptor | null {
  const mapping = ARTIFACT_MAPPING[artefact.generator!];
  if (!mapping) {
    return null;
  }

  return {
    iri: artefact.iri!,
    url: pathRelative(relativeFromPath, artefact.publicUrl!),

    additionalRdfTypes: [],

    ...mapping,
  };
}