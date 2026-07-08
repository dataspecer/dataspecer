import { generateEntityId, type Entity, type EntityChange, type EntityIdentifier, type EntityRecord } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import { VISUAL_MODEL_DATA_TYPE, type VisualModelData } from "../concepts/visual-model-data.ts";
import { VISUAL_VIEW_TYPE } from "../concepts/visual-view.ts";
import {
  isAddVisualDiagramNodeOperation,
  isAddVisualGroupOperation,
  isAddVisualNodeOperation,
  isAddVisualProfileRelationshipOperation,
  isAddVisualRelationshipOperation,
  isDeleteModelColorOperation,
  isDeleteVisualEntityOperation,
  isSetLabelOperation,
  isSetModelColorOperation,
  isSetViewOperation,
  isUpdateVisualEntityOperation,
  type VisualModelOperation,
} from "../operations.ts";
import { VisualEntity } from "../index.ts";
import { ModelEntity, VISUAL_MODEL_ENTITY_TYPE } from "../default-visual-model.ts";

/**
 * Function to apply changes to a visual model.
 *
 * @param writeableVisualModel - The visual model to apply changes to. It will
 * be modified in place, but entities remain immutable.
 * @param operations - Array of operations to apply to the visual model.
 * @returns Array of EntityChange objects representing all changes made.
 */
export function applyOperationsToVisualModel(writeableVisualModel: EntityRecord, operations: Operation[]): EntityChange[] {
  const changes: EntityChange[] = [];
  const model = writeableVisualModel as Record<string, VisualEntity>;

  function del(id: EntityIdentifier) {
    const existing = model[id];
    if (existing !== undefined) {
      delete model[id];
      changes.push({ previous: existing, next: null });
    }
  }

  function update(prev: Entity | null, next: Entity) {
    model[next.id] = next as VisualEntity;
    changes.push({ previous: prev, next: next as VisualEntity });
  }

  function create(next: Entity) {
    model[next.id] = next as VisualEntity;
    changes.push({ previous: null, next: next as VisualEntity });
  }

  function findVisualModelEntityForModelId(modelId: string): VisualModelData | null {
    const visualModelEntities = Object.values(model).filter((entity) => entity.type.includes(VISUAL_MODEL_DATA_TYPE)) as VisualModelData[];
    const visualEntity = visualModelEntities.find((entity) => entity.representedModel === modelId);
    return visualEntity || null;
  }

  for (const operation of operations as VisualModelOperation[]) {
    if (isAddVisualNodeOperation(operation)) {
      const next = operation.entity;
      model[next.id] = next;
      changes.push({ previous: null, next });
    } else if (isAddVisualDiagramNodeOperation(operation)) {
      const next = operation.entity;
      model[next.id] = next;
      changes.push({ previous: null, next });
    } else if (isAddVisualRelationshipOperation(operation)) {
      const next = operation.entity;
      model[next.id] = next;
      changes.push({ previous: null, next });
    } else if (isAddVisualProfileRelationshipOperation(operation)) {
      const next = operation.entity;
      model[next.id] = next;
      changes.push({ previous: null, next });
    } else if (isAddVisualGroupOperation(operation)) {
      const next = operation.entity;
      model[next.id] = next;
      changes.push({ previous: null, next });
    } else if (isUpdateVisualEntityOperation(operation)) {
      const previous = model[operation.entityId];
      if (previous !== undefined) {
        const next = { ...previous, ...operation.updates } as VisualEntity;
        model[operation.entityId] = next;
        changes.push({ previous, next });
      }
    } else if (isDeleteVisualEntityOperation(operation)) {
      del(operation.entityId);
    } else if (isSetModelColorOperation(operation)) {
      const visualModelEntities = Object.values(model).filter((entity) => entity.type.includes(VISUAL_MODEL_DATA_TYPE)) as VisualModelData[];
      const visualEntity = visualModelEntities.find((entity) => entity.representedModel === operation.modelId);
      if (visualEntity) {
        const updatedVisualEntity = {
          ...visualEntity,
          color: operation.color,
        };
        update(visualEntity, updatedVisualEntity);
      } else {
        // If there is no existing visual model data for the represented model, we can create one
        const id = generateEntityId();
        const newVisualModelData: VisualModelData = {
          id: generateEntityId(),
          type: [VISUAL_MODEL_DATA_TYPE],
          representedModel: operation.modelId,
          color: operation.color,
        };
        create(newVisualModelData);
      }
    } else if (isDeleteModelColorOperation(operation)) {
      const entity = findVisualModelEntityForModelId(operation.modelId);
      if (entity) {
        del(entity.id);
      }
    } else if (isSetLabelOperation(operation)) {
      const mainEntity = Object.values(model).find((entity) => entity.type.includes(VISUAL_MODEL_ENTITY_TYPE)) as unknown as ModelEntity;
      const updatedEntity = {
        ...mainEntity,
        label: operation.label,
      };
      model[mainEntity.id] = updatedEntity;
      changes.push({ previous: mainEntity, next: updatedEntity });
    } else if (isSetViewOperation(operation)) {
      // There can be only one view entity
      const viewEntity = Object.values(model).find((entity) => entity.type.includes(VISUAL_VIEW_TYPE)) as unknown as ModelEntity;
      if (viewEntity) {
        const updatedViewEntity = {
          ...viewEntity,
          ...operation.view,
        };
        model[viewEntity.id] = updatedViewEntity;
        changes.push({ previous: viewEntity, next: updatedViewEntity });
      }
    } else {
      operation satisfies never; // type check
      console.error(operation);
      throw new Error(`Unsupported operation type: ${(operation as Operation).type} for visual model executor.`);
    }
  }

  return changes;
}
