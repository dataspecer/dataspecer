import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";

import { CmeProfileModel, CmeProfileModelType } from "../model";
import { LanguageString } from "../../entity-model";
import { ProfileModel } from "../../profile-model";

export function toCmeProfileModel(
  value: ProfileModel,
): CmeProfileModel {
  const modelType = getModelType(value);
  return {
    identifier: value.getId(),
    name: getModelLabel(value),
    modelType: modelType,
    baseIri: getModelBaseIri(value),
  }
}

function getModelLabel(
  model: ProfileModel,
): LanguageString {
  return { "": model.getAlias() ?? model.getId() };
}

function getModelType(model: ProfileModel): CmeProfileModelType {
  if (model instanceof InMemorySemanticModel) {
    return CmeProfileModelType.InMemoryProfileModel;
  } else if (model instanceof ExternalSemanticModel) {
    return CmeProfileModelType.ExternalProfileModel;
  } else {
    return CmeProfileModelType.DefaultProfileModel;
  }
}

function getModelBaseIri(model: ProfileModel): string | null {
  // We support anything with the "getBaseIri" method.
  if (typeof (model as any).getBaseIri === "function") {
    return (model as any).getBaseIri() as string;
  } else {
    return null;
  }
}
