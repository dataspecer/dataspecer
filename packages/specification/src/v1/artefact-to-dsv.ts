import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model/data-specification-artefact";
import { resourceDescriptor } from "../dsv/model.ts";
import { DSV_CONFORMS_TO, PROF } from "../dsv/well-known.ts";
import { pathRelative } from "@dataspecer/core/core/utilities/path-relative";

const ARTIFACT_MAPPING = {
  "http://example.com/generator/json-schema": {
    roles: PROF.ROLE.Schema,
    conformsTo: DSV_CONFORMS_TO.jsonSchema,
    format: DSV_CONFORMS_TO.jsonSchema
  },
  "http://dataspecer.com/generator/json-ld": {
    roles: PROF.ROLE.Schema,
    conformsTo: DSV_CONFORMS_TO.jsonLd,
    format: DSV_CONFORMS_TO.jsonLd
  }
} as Record<string, {
  roles: string | string[];
  conformsTo?: string | string[];
  format: string;
}>;

/**
 * For the given v1 artefact returns a DSV representation of the artefact or
 * null if the representation is not supported and should be skipped.
 */
export function artefactToDsv(artefact: DataSpecificationArtefact, relativeFromPath: string): ReturnType<typeof resourceDescriptor> | null {
  const mapping = ARTIFACT_MAPPING[artefact.generator!];
  if (!mapping) {
    return null;
  }

  return resourceDescriptor({
    id: artefact.iri!,
    artifactFullUrl: pathRelative(relativeFromPath, artefact.publicUrl!),
    ...mapping,
  });
}