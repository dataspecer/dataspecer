import { ModelDsIdentifier, LanguageString } from "../../entity-model";

export interface CmeSemanticModel {

  identifier: ModelDsIdentifier;

  modelType: CmeSemanticModelType;

  name: LanguageString;

  /**
   * Common IRI prefix for all entities in the model.
   */
  baseIri: string | null;

}

export enum CmeSemanticModelType {

  /**
   * Default read only model.
   */
  DefaultSemanticModel = "default",

  /**
   * Writable model.
   */
  InMemorySemanticModel = "in-memory",

  /**
   * Read only model.
   */
  ExternalSemanticModel = "external",

}

export function isCmeSemanticModelReadOnly(model: CmeSemanticModel) {
  switch (model.modelType) {
  case CmeSemanticModelType.DefaultSemanticModel:
    return true;
  case CmeSemanticModelType.ExternalSemanticModel:
    return true;
  case CmeSemanticModelType.InMemorySemanticModel:
    return false;
  }
}
