import { EntityRecord } from "./model/entity.ts";

export interface EntityModel {

  getId(): string;

  getEntities(): EntityRecord;

}
