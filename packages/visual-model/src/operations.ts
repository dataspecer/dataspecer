import { generateOperationId, type Operation } from "@dataspecer/core/operation";
import { fixVisualEntityType, HexColor, VisualDiagramNode, VisualGroup, VisualNode, VisualProfileRelationship, VisualRelationship, VisualView, type VisualEntityAndCoreEntity } from "./concepts/index.ts";
import { ModelIdentifier } from "./entity-model/entity-model.ts";
import { EntityIdentifier } from "./entity-model/entity.ts";
import { LanguageString } from "./entity-model/labeled-model.ts";

/**
 * @see {@link AddVisualNodeOperation}
 */
export const AddVisualNodeOperationType = "http://dataspecer.com/visual-model/operation/add-visual-node" as const;

/**
 * Operation that creates a new visual node in the visual model.
 * A visual node represents a visual representation of an entity (e.g., class or profile).
 */
export interface AddVisualNodeOperation extends Operation {
  type: typeof AddVisualNodeOperationType;

  /**
   * Properties of the visual node to be created (excluding identifier and type).
   */
  entity: VisualNode & VisualEntityAndCoreEntity;
}

export function createAddVisualNodeOperation(entity: VisualNode): AddVisualNodeOperation {
  return {
    id: generateOperationId(),
    type: AddVisualNodeOperationType,
    entity: fixVisualEntityType(entity),
  };
}

export function isAddVisualNodeOperation(operation: Operation): operation is AddVisualNodeOperation {
  return operation.type === AddVisualNodeOperationType;
}

/**
 * @see {@link AddVisualDiagramNodeOperation}
 */
export const AddVisualDiagramNodeOperationType = "http://dataspecer.com/visual-model/operation/add-visual-diagram-node" as const;

/**
 * Operation that creates a new visual diagram node in the visual model.
 * A visual diagram node represents a visual representation of a visual model.
 */
export interface AddVisualDiagramNodeOperation extends Operation {
  type: typeof AddVisualDiagramNodeOperationType;

  /**
   * Properties of the visual diagram node to be created (excluding identifier and type).
   */
  entity: VisualDiagramNode & VisualEntityAndCoreEntity;
}

export function createAddVisualDiagramNodeOperation(entity: VisualDiagramNode): AddVisualDiagramNodeOperation {
  return {
    id: generateOperationId(),
    type: AddVisualDiagramNodeOperationType,
    entity: fixVisualEntityType(entity),
  };
}

export function isAddVisualDiagramNodeOperation(operation: Operation): operation is AddVisualDiagramNodeOperation {
  return operation.type === AddVisualDiagramNodeOperationType;
}

/**
 * @see {@link AddVisualRelationshipOperation}
 */
export const AddVisualRelationshipOperationType = "http://dataspecer.com/visual-model/operation/add-visual-relationship" as const;

/**
 * Operation that creates a new visual relationship (edge) in the visual model.
 * A visual relationship represents a visual representation of a relationship between entities.
 */
export interface AddVisualRelationshipOperation extends Operation {
  type: typeof AddVisualRelationshipOperationType;

  /**
   * Properties of the visual relationship to be created (excluding identifier and type).
   */
  entity: VisualRelationship & VisualEntityAndCoreEntity;
}

export function createAddVisualRelationshipOperation(entity: VisualRelationship): AddVisualRelationshipOperation {
  return {
    id: generateOperationId(),
    type: AddVisualRelationshipOperationType,
    entity: fixVisualEntityType(entity),
  };
}

export function isAddVisualRelationshipOperation(operation: Operation): operation is AddVisualRelationshipOperation {
  return operation.type === AddVisualRelationshipOperationType;
}

/**
 * @see {@link AddVisualProfileRelationshipOperation}
 */
export const AddVisualProfileRelationshipOperationType = "http://dataspecer.com/visual-model/operation/add-visual-profile-relationship" as const;

/**
 * Operation that creates a new visual profile relationship in the visual model.
 * A visual profile relationship represents a visual representation of a profile relationship.
 */
export interface AddVisualProfileRelationshipOperation extends Operation {
  type: typeof AddVisualProfileRelationshipOperationType;

  /**
   * Properties of the visual profile relationship to be created (excluding identifier and type).
   */
  entity: VisualProfileRelationship & VisualEntityAndCoreEntity;
}

export function createAddVisualProfileRelationshipOperation(entity: VisualProfileRelationship): AddVisualProfileRelationshipOperation {
  return {
    id: generateOperationId(),
    type: AddVisualProfileRelationshipOperationType,
    entity: fixVisualEntityType(entity),
  };
}

export function isAddVisualProfileRelationshipOperation(operation: Operation): operation is AddVisualProfileRelationshipOperation {
  return operation.type === AddVisualProfileRelationshipOperationType;
}

/**
 * @see {@link AddVisualGroupOperation}
 */
export const AddVisualGroupOperationType = "http://dataspecer.com/visual-model/operation/add-visual-group" as const;

/**
 * Operation that creates a new visual group in the visual model.
 * A visual group is a container for organizing visual entities on the canvas.
 */
export interface AddVisualGroupOperation extends Operation {
  type: typeof AddVisualGroupOperationType;

  /**
   * Properties of the visual group to be created (excluding identifier and type).
   */
  entity: VisualGroup & VisualEntityAndCoreEntity;
}

export function createAddVisualGroupOperation(entity: VisualGroup): AddVisualGroupOperation {
  return {
    id: generateOperationId(),
    type: AddVisualGroupOperationType,
    entity: fixVisualEntityType(entity),
  };
}

export function isAddVisualGroupOperation(operation: Operation): operation is AddVisualGroupOperation {
  return operation.type === AddVisualGroupOperationType;
}

/**
 * @see {@link UpdateVisualEntityOperation}
 */
export const UpdateVisualEntityOperationType = "http://dataspecer.com/visual-model/operation/update-visual-entity" as const;

/**
 * Operation that updates properties of an existing visual entity.
 *
 * This operation allows partial updates to any visual entity (node, relationship, group, etc.).
 * Only the provided properties will be updated.
 */
export interface UpdateVisualEntityOperation extends Operation {
  type: typeof UpdateVisualEntityOperationType;

  /**
   * Identifier of the entity to be updated.
   */
  entityId: EntityIdentifier;

  /**
   * Partial properties to update. The entity type will not be changed.
   */
  updates: Record<string, unknown>;
}

export function createUpdateVisualEntityOperation(entityId: EntityIdentifier, updates: Record<string, unknown>): UpdateVisualEntityOperation {
  return {
    id: generateOperationId(),
    type: UpdateVisualEntityOperationType,
    entityId,
    updates,
  };
}

export function isUpdateVisualEntityOperation(operation: Operation): operation is UpdateVisualEntityOperation {
  return operation.type === UpdateVisualEntityOperationType;
}

/**
 * @see {@link DeleteVisualEntityOperation}
 */
export const DeleteVisualEntityOperationType = "http://dataspecer.com/visual-model/operation/delete-visual-entity" as const;

/**
 * Operation that removes a visual entity from the visual model.
 *
 * If the entity does not exist, the operation is ignored.
 */
export interface DeleteVisualEntityOperation extends Operation {
  type: typeof DeleteVisualEntityOperationType;

  /**
   * Identifier of the entity to be deleted.
   */
  entityId: EntityIdentifier;
}

export function createDeleteVisualEntityOperation(entityId: EntityIdentifier): DeleteVisualEntityOperation {
  return {
    id: generateOperationId(),
    type: DeleteVisualEntityOperationType,
    entityId,
  };
}

export function isDeleteVisualEntityOperation(operation: Operation): operation is DeleteVisualEntityOperation {
  return operation.type === DeleteVisualEntityOperationType;
}

/**
 * @see {@link SetModelColorOperation}
 */
export const SetModelColorOperationType = "http://dataspecer.com/visual-model/operation/set-model-color" as const;

/**
 * Operation that sets the visual color for a model in the visual model.
 *
 * This is used to visually distinguish models in the visual representation.
 */
export interface SetModelColorOperation extends Operation {
  type: typeof SetModelColorOperationType;

  /**
   * Id of the model that will have its color set.
   */
  modelId: ModelIdentifier;

  /**
   * Hex color code (e.g., "#FF0000" for red) or null to remove the color.
   */
  color: HexColor | null;
}

export function createSetModelColorOperation(forModelId: ModelIdentifier, color: HexColor): SetModelColorOperation {
  return {
    id: generateOperationId(),
    type: SetModelColorOperationType,
    modelId: forModelId,
    color,
  };
}

export function isSetModelColorOperation(operation: Operation): operation is SetModelColorOperation {
  return operation.type === SetModelColorOperationType;
}

/**
 * @see {@link DeleteModelColorOperation}
 */
export const DeleteModelColorOperationType = "http://dataspecer.com/visual-model/operation/delete-model-color" as const;

/**
 * Operation that removes the color assignment for a model.
 *
 * This removes the visual color associated with the model in the visual model.
 */
export interface DeleteModelColorOperation extends Operation {
  type: typeof DeleteModelColorOperationType;

  /**
   * Identifier of the model to remove the color for.
   */
  modelId: ModelIdentifier;
}

export function createDeleteModelColorOperation(modelId: ModelIdentifier): DeleteModelColorOperation {
  return {
    id: generateOperationId(),
    type: DeleteModelColorOperationType,
    modelId,
  };
}

export function isDeleteModelColorOperation(operation: Operation): operation is DeleteModelColorOperation {
  return operation.type === DeleteModelColorOperationType;
}

/**
 * @see {@link SetLabelOperation}
 */
export const SetLabelOperationType = "http://dataspecer.com/visual-model/operation/set-label" as const;

/**
 * Operation that sets the label of the visual model.
 *
 * The label can be a multilingual string with language-specific values.
 */
export interface SetLabelOperation extends Operation {
  /**
   * The label(s) for the visual model, which can be multilingual.
   * Use null to remove the label.
   */
  label: LanguageString | null;
}

export function createSetLabelOperation(label: LanguageString | null): SetLabelOperation {
  return {
    id: generateOperationId(),
    type: SetLabelOperationType,
    label,
  };
}

export function isSetLabelOperation(operation: Operation): operation is SetLabelOperation {
  return operation.type === SetLabelOperationType;
}

/**
 * @see {@link SetViewOperation}
 */
export const SetViewOperationType = "http://dataspecer.com/visual-model/operation/set-view" as const;

/**
 * Operation that sets or updates the visual view/viewport configuration.
 *
 * This controls the camera/viewport settings for displaying the visual model.
 *
 * @todo Consider to store it somewhere else because this is not truly a state of the model.
 */
export interface SetViewOperation extends Operation {
  type: typeof SetViewOperationType;

  /**
   * View configuration including position, zoom level, and other viewport properties.
   */
  view: Omit<VisualView, "identifier" | "id" | "type">;
}

export function createSetViewOperation(view: Omit<VisualView, "identifier" | "type">): SetViewOperation {
  return {
    id: generateOperationId(),
    type: SetViewOperationType,
    view,
  };
}

export function isSetViewOperation(operation: Operation): operation is SetViewOperation {
  return operation.type === SetViewOperationType;
}

/**
 * Union type of all visual model operations.
 */
export type VisualModelOperation =
  | AddVisualNodeOperation
  | AddVisualDiagramNodeOperation
  | AddVisualRelationshipOperation
  | AddVisualProfileRelationshipOperation
  | AddVisualGroupOperation
  | UpdateVisualEntityOperation
  | DeleteVisualEntityOperation
  | SetModelColorOperation
  | DeleteModelColorOperation
  | SetLabelOperation
  | SetViewOperation;
