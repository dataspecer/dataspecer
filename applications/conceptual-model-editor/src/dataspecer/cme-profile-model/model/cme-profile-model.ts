import { ModelDsIdentifier, LanguageString } from "../../entity-model";

export interface CmeProfileModel {

  identifier: ModelDsIdentifier;

  modelType: CmeProfileModelType;

  name: LanguageString;

  /**
   * Common IRI prefix for all entities in the model.
   */
  baseIri: string | null;

}

export enum CmeProfileModelType {

  /**
   * Default read only model.
   */
  DefaultProfileModel = "default",

  /**
   * Writable model.
   */
  InMemoryProfileModel = "in-memory",

  /**
   * Read only model.
   */
  ExternalProfileModel = "external",

}

export function isCmeProfileModelReadOnly(model: CmeProfileModel) {
  switch (model.modelType) {
    case CmeProfileModelType.DefaultProfileModel:
      return true;
    case CmeProfileModelType.ExternalProfileModel:
      return true;
    case CmeProfileModelType.InMemoryProfileModel:
      return false;
  }
}
