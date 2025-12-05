import { VisualModel } from "@dataspecer/visual-model";
import { ClassesContextType } from "../../context/classes-context";
import { ModelGraphContextType } from "../../context/model-context";
import {
  type BaseEntityDialogState,
  createEditBaseEntityDialogState,
  createNewBaseEntityDialogState,
} from "../base-entity/base-entity-dialog-state";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { semanticModelMapToCmeSemanticModel } from "../../dataspecer/cme-model/adapter";
import { representClasses } from "../utilities/dialog-utilities";
import { configuration, t } from "../../application";

export type ClassDialogState = BaseEntityDialogState;

export function createNewClassDialogState(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  visualModel: VisualModel | null,
  language: string,
  defaultModelIdentifier: string | null,
): ClassDialogState {

  const allModels = semanticModelMapToCmeSemanticModel(
    graphContext.models, visualModel,
    configuration().defaultModelColor,
    identifier => t("model-service.model-label-from-id", identifier));

  const allSpecializations = representClasses(
    graphContext.models, allModels, classesContext.classes);

  // BaseEntity

  const entityState = createNewBaseEntityDialogState(
    language,
    defaultModelIdentifier, allModels,
    allSpecializations,
    configuration().relationshipNameToIri);

  return {
    ...entityState,
  };
}

export function createEditClassDialogState(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  visualModel: VisualModel | null,
  language: string,
  model: InMemorySemanticModel,
  entity: SemanticModelClass,
): ClassDialogState {

  const allModels = semanticModelMapToCmeSemanticModel(
    graphContext.models, visualModel,
    configuration().defaultModelColor,
    identifier => t("model-service.model-label-from-id", identifier));

  const allSpecializations = representClasses(
    graphContext.models, allModels, classesContext.classes);

  // BaseEntity

  const entityState = createEditBaseEntityDialogState(
    language, graphContext.models, allModels,
    { identifier: entity.id, model: model.getId() },
    entity.iri ?? "", entity.name, entity.description,
    entity.externalDocumentationUrl ?? "",
    allSpecializations);

  return {
    ...entityState,
  };
}
