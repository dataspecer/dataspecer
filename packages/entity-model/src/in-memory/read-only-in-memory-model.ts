import { EntityModel } from "../entity-model.ts";
import { EntityRecord } from "../model/index.ts";

class ReadOnlyInMemoryEntityModel implements EntityModel {

  readonly identifier: string;

  readonly entities: EntityRecord = {};

  constructor(
    identifier: string,
    entities: EntityRecord,
  ) {
    this.identifier = identifier;
    // We create a copy.
    this.entities = { ...entities };
  }

  getId(): string {
    return this.identifier;
  }

  getEntities(): EntityRecord {
    return this.entities;
  }

}

export function createReadOnlyInMemoryEntityModel(
  identifier: string, entities: EntityRecord,
): EntityModel {
  return new ReadOnlyInMemoryEntityModel(identifier, entities);
}
