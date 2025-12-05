import type { CoreResource } from "@dataspecer/core/core/core-resource";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";

interface ResultModel {
  /**
   * Processed model entities.
   */
  model: CoreResource[];

  /**
   * Full IRI of the schema entity.
   */
  iri: string,

  /**
   * Name of this particular model without slashes or hashes.
   */
  fileNamePart: string,
}

/**
 * Takes all own structure models from the specification and fixes their IRIs before export.
 *
 * We will take technical label of schema to create iris in form base + technical label + uuid.
 * @param structureModels Array of structure models to process.
 * @param knownIriMapping Mapping of old IRIs to new IRIs, mainly from semantic models.
 * @param baseIri Base IRI to use for generating new IRIs, ends with slash or hash.
 * @returns Processed structure models with fixed IRIs.
 */
export function processStructureModelIrisBeforeExport(structureModels: CoreResource[][], knownIriMapping: Record<string, string>, baseIri: string): ResultModel[] {
  const result: ResultModel[] = [];

  for (const structureModel of structureModels) {
    const schema = structureModel.find(DataPsmSchema.is)!;
    const thisSchemaTechnicalLabel = schema.dataPsmTechnicalLabel || schema.iri!;

    const thisSchemaBaseIri = `${baseIri}${thisSchemaTechnicalLabel}#`;

    // Add entry for schema itself
    knownIriMapping[schema.iri!] = thisSchemaBaseIri;

    // Iterate all entities and create iri mapping
    for (const entity of structureModel) {
      if (!knownIriMapping[entity.iri!]) {
        knownIriMapping[entity.iri!] = `${thisSchemaBaseIri}${getNiceIri(entity)}`;
      }
    }

    result.push({
      model: structureModel,
      iri: thisSchemaBaseIri,
      fileNamePart: thisSchemaTechnicalLabel,
    });
  }

  // Now, we can replace all IRIs in all structure models
  // We use hack for it and simply traverse all properties of each entity

  for (const model of result) {
    const newStructureModel: CoreResource[] = [];
    for (const entity of model.model) {
      const newIri = knownIriMapping[entity.iri!];
      const newEntity = recursivelyReplace(entity, knownIriMapping);
      newEntity.iri = newIri;
      newStructureModel.push(newEntity);
    }
    model.model = newStructureModel;
  }

  return result;
}

function getNiceIri(entity: CoreResource): string {
  const uuid = entity.iri!.split("/").pop()!;
  const type = entity.types[0].split("/")!.pop()!;

  return `${type}_${uuid}`;
}

function recursivelyReplace<T>(input: T, iriMapping: Record<string, string>): T {
  if (typeof input === "string") {
    if (Object.hasOwn(iriMapping, input)) {
      return iriMapping[input] as unknown as T;
    } else {
      return input;
    }
  } else if (Array.isArray(input)) {
    return input.map(item => recursivelyReplace(item, iriMapping)) as unknown as T;
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
