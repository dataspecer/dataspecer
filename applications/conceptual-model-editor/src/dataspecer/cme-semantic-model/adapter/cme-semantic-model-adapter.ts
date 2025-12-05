import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";

import { CmeSemanticModel, CmeSemanticModelType } from "../model";
import { LanguageString } from "../../entity-model";
import { SemanticModel } from "../../semantic-model";

export function toCmeSemanticModel(
  value: SemanticModel,
): CmeSemanticModel {
  const modelType = getModelType(value);
  return {
    identifier: value.getId(),
    name: getModelLabel(value),
    modelType,
    baseIri: getModelBaseIri(value),
  }
}

function getModelLabel(
  model: SemanticModel,
): LanguageString {
  return { "": model.getAlias() ?? model.getId() };
}

function getModelType(model: SemanticModel): CmeSemanticModelType {
  if (model instanceof InMemorySemanticModel) {
    return CmeSemanticModelType.InMemorySemanticModel;
  } else if (model instanceof ExternalSemanticModel) {
    return CmeSemanticModelType.ExternalSemanticModel;
  } else {
    return CmeSemanticModelType.DefaultSemanticModel;
  }
}

function getModelBaseIri(model: SemanticModel): string | null {
  // We support anything with the "getBaseIri" method.
  if (typeof (model as any).getBaseIri === "function") {
    return (model as any).getBaseIri() as string;
  } else {
    return null;
  }
}
