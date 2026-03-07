import { EntityRecord } from "./model/entity.ts";

export type ModelIdentifier = string;

export interface EntityModel {

  getId(): ModelIdentifier;

  getEntities(): EntityRecord;

}
