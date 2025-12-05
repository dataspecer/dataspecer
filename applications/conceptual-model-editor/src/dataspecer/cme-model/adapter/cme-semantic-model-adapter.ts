import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { HexColor, VisualModel } from "@dataspecer/visual-model";

import { SemanticModel } from "../../semantic-model";
import { CmeSemanticModel, CmeSemanticModelNameLanguage, CmeSemanticModelType } from "../model";
import { LanguageString } from "../../entity-model";

/**
 * This function shall be removed once we do not need to work with Map os models.
 */
export function semanticModelMapToCmeSemanticModel(
  models: Map<string, SemanticModel>,
  visualModel: VisualModel | null,
  defaultColor: HexColor,
  defaultLabel: (identifier: string) => string,
): CmeSemanticModel[] {
  const result: CmeSemanticModel[] = [];
  for (const value of models.values()) {
    result.push(semanticModelToCmeSemanticModel(
      value, visualModel, defaultColor, defaultLabel));
  }
  return result;
}

export function semanticModelToCmeSemanticModel(
  model: SemanticModel,
  visualModel: VisualModel | null,
  defaultColor: HexColor,
  defaultLabel: (identifier: string) => string,
): CmeSemanticModel {
  return {
    identifier: model.getId(),
    name: getModelLabel(model, defaultLabel),
    modelType: getModelType(model),
    color: visualModel?.getModelColor(model.getId()) ?? defaultColor,
    baseIri: getModelBaseIri(model),
  }
}

function getModelLabel(
  model: SemanticModel,
  defaultLabel: (identifier: string) => string,
): LanguageString {
  const alias = model.getAlias();
  if (alias !== null) {
    return { [CmeSemanticModelNameLanguage]: alias };
  }
  return {
    [CmeSemanticModelNameLanguage]: defaultLabel(model.getId()),
  };
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
