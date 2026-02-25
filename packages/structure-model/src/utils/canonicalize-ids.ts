import type { CoreResource } from "@dataspecer/core/core/core-resource";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import { getSchemaLabel } from "./schema-label.ts";

/**
 * You can find two kinds of something that looks like identifiers: IDs and
 * IRIs. IDs are internal identifiers, usually random UUIDs, that are not meant
 * to be "exported". Their goal is to uniquely identify entities within the
 * Dataspecer and be stable. For export purposes we use IRIs. Sometimes you can
 * find the concept of base IRI, then the final IRI is created by appending the
 * base IRI and the relative IRI of the entity.
 *
 * Due to historical reasons, PSM does not use IRIs yet, but only IDs.
 * Furthermore, these IDs are under `iri` property, which is misleading.
 *
 * In order to export PSM, for now, what we do is to convert these IDs (under
 * `iri` property) to proper IRIs (also under `iri` property) during export.
 *
 * This utility function performs this conversion.
 *
 * ---
 *
 * We will take technical label of schema to create iris in form base +
 * technical label + uuid.
 * @param structureModels Array of structure models to process.
 * @param knownIriMapping Mapping of old IDs to new IDs, mainly from semantic models. This will be updated with new mappings.
 * @param baseIri Base IRI to use for generating new IRIs, ends with slash or hash. Base iri can be null only if all schema IRIs are already known by knownIriMapping.
 * @returns Processed structure models with fixed IRIs.
 */
export function canonicalizeIds(structureModels: CoreResource[][], knownIriMapping: Record<string, string>, baseIri: string | null = null): ResultModel[] {
  const result: ResultModel[] = [];

  for (const structureModel of structureModels) {
    const schema = structureModel.find(DataPsmSchema.is)!;
    const schemaLabel = getSchemaLabel(schema);

    let thisSchemaBaseIri: string;
    if (knownIriMapping[schema.iri!]) {
      thisSchemaBaseIri = knownIriMapping[schema.iri!]!;
      if (!thisSchemaBaseIri.endsWith("/") && !thisSchemaBaseIri.endsWith("#")) {
        thisSchemaBaseIri += "/"; // Ensure it ends with slash
      }
    } else {
      if (baseIri === null) {
        throw new Error("When canonicalizing IDs, if the schema IRI is not known, base IRI must be provided.");
      }
      const thisSchemaIri = `${baseIri}${schemaLabel}/`;
      thisSchemaBaseIri = `${thisSchemaIri}`; // We use slash for schema
      // Add entry for schema itself
      knownIriMapping[schema.iri!] = thisSchemaIri;
    }

    // Iterate all entities and create iri mapping
    for (const entity of structureModel) {
      if (!knownIriMapping[entity.iri!]) {
        knownIriMapping[entity.iri!] = `${thisSchemaBaseIri}${getNiceIri(entity)}`;
      }
    }

    result.push({
      model: structureModel,
      iri: knownIriMapping[schema.iri!]!,
      fileNamePart: schemaLabel,
    });
  }

  // Now, we can replace all IRIs in all structure models
  // We use hack for it and simply traverse all properties of each entity

  for (const model of result) {
    const newStructureModel: CoreResource[] = [];
    for (const entity of model.model) {
      const newIri = knownIriMapping[entity.iri!]!;
      const newEntity = recursivelyReplace(entity, knownIriMapping);
      newEntity.iri = newIri;
      newStructureModel.push(newEntity);
    }
    model.model = newStructureModel;
  }

  return result;
}

interface ResultModel {
  /**
   * Processed model entities.
   */
  model: CoreResource[];

  /**
   * Full IRI of the schema entity.
   */
  iri: string;

  /**
   * Name of this particular model without slashes or hashes.
   */
  fileNamePart: string;
}

/**
 * Generates nice IRI fragment for an entity.
 */
function getNiceIri(entity: CoreResource): string {
  const lastChunk = entity.iri!.split("/").pop()!;
  let type = entity.types[0]!.split("/")!.pop()!;
  type = type.charAt(0).toLowerCase() + type.slice(1);

  // We only add type info for old type of IDs that have specific format.
  // Because this function can be run multiple times so it would bloat the IRIs
  // with repetitive type info.
  if (lastChunk.match(/^[0-9]+(-[a-z0-9]{4}){3}$/)) {
    return `${type}-${lastChunk}`;
  }

  return `${lastChunk}`;
}

function recursivelyReplace<T>(input: T, iriMapping: Record<string, string>): T {
  if (typeof input === "string") {
    if (Object.hasOwn(iriMapping, input)) {
      return iriMapping[input] as unknown as T;
    } else {
      return input;
    }
  } else if (Array.isArray(input)) {
    return input.map((item) => recursivelyReplace(item, iriMapping)) as unknown as T;
  } else if (typeof input === "object" && input !== null) {
    const output: any = {};
    for (const [key, value] of Object.entries(input)) {
      output[key] = recursivelyReplace(value, iriMapping);
    }
    return output as T;
  } else {
    return input;
  }
}
