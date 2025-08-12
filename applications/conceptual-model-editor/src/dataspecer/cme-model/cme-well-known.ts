import { CmeEntity } from "./model";
import { CmePrimitiveType } from "./model/cme-primitive-type";
import { CmeSemanticModel, CmeSemanticModelType } from "./model/cme-semantic-model";

export const UnknownCmeSemanticModel: CmeSemanticModel = Object.freeze({
  identifier: "unknown-cme-vocabulary",
  name: { "": "Unknown vocabulary" },
  color: "#99028c",
  modelType: CmeSemanticModelType.DefaultSemanticModel,
  baseIri: null,
});

/**
 * Represent broken or unknown entities.
 */
export const UnknownCmeEntity: CmeEntity = Object.freeze({
  identifier: "unknown-cme-entity-type",
  iri: null,
  model: UnknownCmeSemanticModel.identifier,
  name: { "": "Unknown entity" },
});

/**
 * Represents null for entity references.
 */
export const UnspecifiedCmeEntity: CmeEntity = Object.freeze({
  identifier: "unspecified-cme-entity-type",
  iri: null,
  model: UnknownCmeSemanticModel.identifier,
  name: { "": "Unspecified entity" },
});

export const UnknownCmePrimitiveType: CmePrimitiveType = Object.freeze({
  identifier: "unknown-cme-primitive-type",
  iri: null,
  model: UnknownCmeSemanticModel.identifier,
  name: { "": "Unknown primitive type" },
});

export const OwlCmeSemanticModel: CmeSemanticModel = Object.freeze({
  identifier: "https://www.w3.org/2002/07/owl",
  name: { "": "owl" },
  color: "#99028c",
  modelType: CmeSemanticModelType.DefaultSemanticModel,
  baseIri: "https://www.w3.org/2002/07/owl",
});

export const OwlThingCmeEntity: CmeEntity = Object.freeze({
  identifier: "http://www.w3.org/2002/07/owl#Thing",
  iri: "http://www.w3.org/2002/07/owl#Thing",
  model: OwlCmeSemanticModel.identifier,
  name: { "": "owl:Thing" },
});
