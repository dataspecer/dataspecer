import type { EntityChange } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import type { HexColor } from "./concepts/color.ts";
import { isVisualDiagramNode, type VisualDiagramNode } from "./concepts/visual-diagram-node.ts";
import type { VisualEntity } from "./concepts/visual-entity.ts";
import { isVisualGroup, type VisualGroup } from "./concepts/visual-group.ts";
import { isModelVisualInformation, type VisualModelData } from "./concepts/visual-model-data.ts";
import { isVisualNode, type VisualNode } from "./concepts/visual-node.ts";
import { isVisualProfileRelationship, type VisualProfileRelationship } from "./concepts/visual-profile-relationship.ts";
import { isVisualRelationship, type VisualRelationship } from "./concepts/visual-relationship.ts";
import { isVisualView, type VisualView } from "./concepts/visual-view.ts";
import { VISUAL_MODEL_ENTITY_TYPE, type ModelEntity } from "./default-visual-model.ts";
import {
  createAddVisualDiagramNodeOperation, createAddVisualGroupOperation,
  createAddVisualNodeOperation, createAddVisualProfileRelationshipOperation,
  createAddVisualRelationshipOperation, createDeleteModelColorOperation,
  createDeleteVisualEntityOperation, createSetLabelOperation,
  createSetModelColorOperation, createSetViewOperation,
  createUpdateVisualEntityOperation,
} from "./operations.ts";

export interface VisualModelOperationsResult {
  operations: Operation[];
  remainingChanges: EntityChange[];
}

function isModelEntity(entity: VisualEntity): entity is ModelEntity {
  return entity.type.includes(VISUAL_MODEL_ENTITY_TYPE);
}

/**
 * Converts entity changes into visual model operations, using the most
 * specific operation available for each visual entity kind. Remaining
 * changes (there should be none for a well-formed visual model) are
 * returned so another layer can handle them.
 *
 * Operations are ordered to avoid acting on non-existing entities: create
 * nodes → create relationships/groups → set model color/label/view →
 * modify all → delete relationships/groups → delete nodes → delete model
 * color/label/view.
 */
export function changesToVisualModelOperations(changes: EntityChange[]): VisualModelOperationsResult {
  const remainingChanges: EntityChange[] = [];

  const createNodeOps: Operation[] = [];
  const createRelGroupOps: Operation[] = [];
  const setOps: Operation[] = [];
  const modifyOps: Operation[] = [];
  const deleteRelGroupOps: Operation[] = [];
  const deleteNodeOps: Operation[] = [];
  const deleteSetOps: Operation[] = [];

  for (const change of changes) {
    const entity = (change.next ?? change.previous) as VisualEntity;

    if (isVisualNode(entity)) {
      if (change.previous === null) {
        const { type: _, ...rest } = change.next as VisualNode;
        createNodeOps.push(createAddVisualNodeOperation(rest));
      } else if (change.next === null) {
        deleteNodeOps.push(createDeleteVisualEntityOperation(change.previous.id));
      } else {
        const { type: _, id, ...rest } = change.next as VisualNode;
        modifyOps.push(createUpdateVisualEntityOperation(id, rest));
      }
    } else if (isVisualDiagramNode(entity)) {
      if (change.previous === null) {
        const { type: _, ...rest } = change.next as VisualDiagramNode;
        createNodeOps.push(createAddVisualDiagramNodeOperation(rest));
      } else if (change.next === null) {
        deleteNodeOps.push(createDeleteVisualEntityOperation(change.previous.id));
      } else {
        const { type: _, id, ...rest } = change.next as VisualDiagramNode;
        modifyOps.push(createUpdateVisualEntityOperation(id, rest));
      }
    } else if (isVisualRelationship(entity)) {
      if (change.previous === null) {
        const { type: _, ...rest } = change.next as VisualRelationship;
        createRelGroupOps.push(createAddVisualRelationshipOperation(rest));
      } else if (change.next === null) {
        deleteRelGroupOps.push(createDeleteVisualEntityOperation(change.previous.id));
      } else {
        const { type: _, id, ...rest } = change.next as VisualRelationship;
        modifyOps.push(createUpdateVisualEntityOperation(id, rest));
      }
    } else if (isVisualProfileRelationship(entity)) {
      if (change.previous === null) {
        const { type: _, ...rest } = change.next as VisualProfileRelationship;
        createRelGroupOps.push(createAddVisualProfileRelationshipOperation(rest));
      } else if (change.next === null) {
        deleteRelGroupOps.push(createDeleteVisualEntityOperation(change.previous.id));
      } else {
        const { type: _, id, ...rest } = change.next as VisualProfileRelationship;
        modifyOps.push(createUpdateVisualEntityOperation(id, rest));
      }
    } else if (isVisualGroup(entity)) {
      if (change.previous === null) {
        const { type: _, ...rest } = change.next as VisualGroup;
        createRelGroupOps.push(createAddVisualGroupOperation(rest));
      } else if (change.next === null) {
        deleteRelGroupOps.push(createDeleteVisualEntityOperation(change.previous.id));
      } else {
        const { type: _, id, ...rest } = change.next as VisualGroup;
        modifyOps.push(createUpdateVisualEntityOperation(id, rest));
      }
    } else if (isModelVisualInformation(entity)) {
      // Set-model-color creates or updates the entity, there is no separate modify operation.
      if (change.next === null) {
        deleteSetOps.push(createDeleteModelColorOperation((change.previous as VisualModelData).representedModel));
      } else {
        const next = change.next as VisualModelData;
        setOps.push(createSetModelColorOperation(next.representedModel, next.color as HexColor));
      }
    } else if (isVisualView(entity)) {
      // Set-view creates or updates the entity, there is no separate modify or delete operation.
      if (change.next === null) {
        deleteSetOps.push(createDeleteVisualEntityOperation(change.previous.id));
      } else {
        const { type: _, id: __, ...rest } = change.next as VisualView;
        setOps.push(createSetViewOperation(rest));
      }
    } else if (isModelEntity(entity)) {
      // Set-label creates or updates the entity, there is no separate modify or delete operation.
      if (change.next === null) {
        deleteSetOps.push(createDeleteVisualEntityOperation(change.previous.id));
      } else {
        setOps.push(createSetLabelOperation((change.next as ModelEntity).label));
      }
    } else {
      remainingChanges.push(change);
    }
  }

  return {
    operations: [...createNodeOps, ...createRelGroupOps, ...setOps, ...modifyOps, ...deleteRelGroupOps, ...deleteNodeOps, ...deleteSetOps],
    remainingChanges,
  };
}
