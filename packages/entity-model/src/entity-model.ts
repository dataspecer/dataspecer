import { EntityRecord } from "./model/entity.ts";

export type EntityModelChangeListener = (
  updated: EntityRecord,
  removed: string[],
) => void;

export interface EntityModel {

  getId(): string;

  getEntities(): EntityRecord;

  subscribeToChanges(listener: EntityModelChangeListener): () => void;

}

