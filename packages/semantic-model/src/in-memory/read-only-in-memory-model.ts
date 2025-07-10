import { SemanticEntityRecord, SemanticModel,  } from "../semantic-model.ts";

class ReadOnlyInMemorySemanticModel implements SemanticModel {

  readonly identifier: string;

  readonly baseIri: string | null;

  readonly entities: SemanticEntityRecord = {};

  constructor(
    identifier: string,
    baseIri: string | null,
    entities: SemanticEntityRecord,
  ) {
    this.identifier = identifier;
    this.baseIri = baseIri;
    // We create a copy.
    this.entities = { ...entities };
  }

  getId(): string {
    return this.identifier;
  }

  getEntities(): SemanticEntityRecord {
    return this.entities;
  }

  getBaseIri(): string | null {
    return this.baseIri;
  }

}

export function createReadOnlyInMemoryProfileModel(
  identifier: string,
  baseIri: string | null,
  entities: SemanticEntityRecord,
): SemanticModel {
  return new ReadOnlyInMemorySemanticModel(identifier, baseIri, entities);
}
