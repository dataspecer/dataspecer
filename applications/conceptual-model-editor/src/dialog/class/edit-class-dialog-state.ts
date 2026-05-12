import { EntityModel } from "@dataspecer/core-v2";
import { VisualModel } from "@dataspecer/visual-model";
import {
  type BaseEntityDialogState,
  createEditBaseEntityDialogState,
  createNewBaseEntityDialogState,
} from "../base-entity/base-entity-dialog-state";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { semanticModelTrackerToCmeSemanticModel } from "../../dataspecer/cme-model/adapter";
import {
  representClassesFromTracker,
} from "../utilities/dialog-utilities";
import { configuration } from "../../application";
import { LabelResolver } from "../../dependency-tracker";
import { DialogSemanticTracker } from "../dialog-semantic-tracker";

export type ClassDialogState = BaseEntityDialogState;

export function createNewClassDialogState(
  visualModel: VisualModel | null,
  language: string,
  defaultModelIdentifier: string | null,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
): ClassDialogState {

  const allModels = semanticModelTrackerToCmeSemanticModel(
    tracker.semanticModels, visualModel,
    configuration().defaultModelColor);

  const allSpecializations = representClassesFromTracker(tracker, labelResolver);

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
  visualModel: VisualModel | null,
  language: string,
  model: InMemorySemanticModel,
  entity: SemanticModelClass,
  entityModels: Map<string, EntityModel>,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
): ClassDialogState {

  const allModels = semanticModelTrackerToCmeSemanticModel(
    tracker.semanticModels, visualModel,
    configuration().defaultModelColor);

  const allSpecializations = representClassesFromTracker(tracker, labelResolver);

  // BaseEntity

  const entityState = createEditBaseEntityDialogState(
    language, entityModels, allModels,
    { identifier: entity.id, model: model.getId() },
    entity.iri ?? "", entity.name, entity.description,
    entity.externalDocumentationUrl ?? "",
    allSpecializations,
    entity.order ?? "");

  return {
    ...entityState,
  };
}
