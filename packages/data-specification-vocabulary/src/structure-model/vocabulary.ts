import { DataFactory } from "n3";

export const STRUCTURE_BASE_IRI = "https://example.com/structure/";
export const DUMP_BASE_IRI = STRUCTURE_BASE_IRI + "/dump/";

const IRI = DataFactory.namedNode;

export const STRUCTURE_MODEL_DSV = {
  base: IRI(STRUCTURE_BASE_IRI),
  entity: IRI(STRUCTURE_BASE_IRI + "structure-entity"),
  dump: IRI(DUMP_BASE_IRI),
};
