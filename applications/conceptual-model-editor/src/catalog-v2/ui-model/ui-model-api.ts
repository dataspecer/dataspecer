import { EntityDsIdentifier, ModelDsIdentifier } from "../../dataspecer/entity-model";
import { UiEntity, UiReference, UiSemanticModel } from "./model";
import { UiModelState } from "./ui-model-state";

export interface UiModelApi {

  getUnknownEntity: () => UiEntity;

  getEntity(reference: UiReference): UiEntity | null;

  getEntityByIdentifier(identifier: EntityDsIdentifier): UiEntity | null;

  getSemanticModel(identifier: ModelDsIdentifier): UiSemanticModel | null;

  getUnknownSemanticModel: () => UiSemanticModel;

}

export function wrapUiModelStateToUiModelApi(
  state: UiModelState,
): UiModelApi {
  const entitiesMap: Record<string, UiEntity[]> = {};
  const addToEntitiesMap = (item: UiEntity) => {
    if (entitiesMap[item.identifier] === undefined) {
      entitiesMap[item.identifier] = [];
    }
    entitiesMap[item.identifier].push(item);
  }

  state.classProfiles.forEach(addToEntitiesMap);
  state.classes.forEach(addToEntitiesMap);
  state.generalizations.forEach(addToEntitiesMap);
  state.relationshipProfiles.forEach(addToEntitiesMap);
  state.relationships.forEach(addToEntitiesMap);

  const semanticModels = state.semanticModels;

  return {
    getUnknownEntity() {
      return state.unknownUiEntity;
    },
    getEntity(reference) {
      const entities = entitiesMap[reference.identifier];
      return entities.find(item => item.model.identifier === reference.model)
        ?? null;
    },
    getEntityByIdentifier(identifier) {
      const entities = entitiesMap[identifier];
      return entities?.[0] ?? null;
    },
    getSemanticModel(identifier) {
      return semanticModels.find(model => model.identifier === identifier)
        ?? state.unknownSemanticModel;
    },
    getUnknownSemanticModel() {
      return state.unknownSemanticModel;
    },
  }
}
