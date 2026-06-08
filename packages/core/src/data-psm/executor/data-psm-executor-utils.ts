import {
  CoreResourceReader,
  CoreResource,
  CoreExecutorResult,
} from "../../core/index.ts";
import { DataPsmSchema, DataPsmClass, DataPsmContainer } from "../model/index.ts";

export function loadDataPsmSchema(
  reader: CoreResourceReader
): DataPsmSchema | null {
  for (const iri of reader.listResources()) {
    const resource = reader.readResource(iri);
    if (DataPsmSchema.is(resource)) {
      return resource;
    }
  }
  return null;
}

export function loadDataPsmClass(
  reader: CoreResourceReader,
  iri: string
): DataPsmClass | DataPsmContainer | null {
  const result = reader.readResource(iri);
  if (DataPsmClass.is(result) || DataPsmContainer.is(result)) {
    return result;
  }
  return null;
}

/**
 * Helper class for common errors.
 */
export class DataPsmExecutorResultFactory {
  protected constructor() {}

  static missing(iri: string): CoreExecutorResult {
    return CoreExecutorResult.createError(
      `Missing data-psm resource '${iri}'.`
    );
  }

  static missingSchema(): CoreExecutorResult {
    return CoreExecutorResult.createError("Missing data-psm schema object.");
  }

  static missingOwner(owner: string): CoreExecutorResult {
    return CoreExecutorResult.createError(
      `Missing data-psm owner class: '${owner}'.`
    );
  }

  static invalidType(
    resource: CoreResource | null,
    expected: string
  ): CoreExecutorResult {
    if (resource === null) {
      return CoreExecutorResult.createError(
        `Missing resource of type ${expected}`
      );
    }
    const types = resource.types.join(",");
    return CoreExecutorResult.createError(
      `Resource '${resource.iri}' (${types}) ` +
        `is not of expected type '${expected}'.`
    );
  }
}

export function removeFromClass(
  reader: CoreResourceReader,
  ownerClass: string,
  entityToRemove: string
): CoreExecutorResult {
  const schema = loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  const owner = loadDataPsmClass(reader, ownerClass);
  if (owner === null) {
    return DataPsmExecutorResultFactory.missingOwner(ownerClass);
  }

  // We do not check if the deleted item is part of the schema nor class
  // to allow deletion of dangling objects.

  return CoreExecutorResult.createSuccess(
    [],
    [{
      ...schema,
      dataPsmParts: removeValue(entityToRemove, schema.dataPsmParts),
    } as DataPsmSchema, {
      ...owner,
      dataPsmParts: removeValue(entityToRemove, owner.dataPsmParts),
    } as DataPsmClass],
    [entityToRemove]
  );
}

export function removeValue<T>(valueToRemove: T, array: T[]): T[] {
  return array.filter((value) => value !== valueToRemove);
}
