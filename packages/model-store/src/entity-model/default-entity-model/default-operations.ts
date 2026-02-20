import type { Entity, EntityIdentifier } from "../entity.ts";
import type { Operation } from "../writable-entity-model.ts";

export class CreateOrUpdateEntityOperation implements Operation {
  id: string;
  type = "operations/create-or-update-entity";
  entity: Entity;

  constructor(id: string, entity: Entity) {
    this.id = id;
    this.entity = entity;
  }
}

export class RemoveEntityOperation implements Operation {
  id: string;
  type = "operations/remove-entity";
  identifier: EntityIdentifier;

  constructor(id: string, identifier: EntityIdentifier) {
    this.id = id;
    this.identifier = identifier;
  }
}
