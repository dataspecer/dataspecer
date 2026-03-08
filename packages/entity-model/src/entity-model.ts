import { Entity, EntityRecord } from "./model/entity.ts";

export type ModelIdentifier = string;

export interface EntityModel {

  getId(): ModelIdentifier;

  getEntities(): EntityRecord;

}

type Observer = (updated: Record<string, Entity>, removed: string[]) => void;

export interface ObservableEntityModelV2 extends EntityModel {

  subscribeToChanges(callback: Observer): () => void;

}

export function isObservableEntityModelV2(
  model: EntityModel,
): model is ObservableEntityModelV2 {
  return (model as any).subscribeToChanges !== undefined;
}
