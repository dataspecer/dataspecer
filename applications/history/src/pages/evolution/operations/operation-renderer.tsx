import {
  isCreateClassOperation,
  isCreateGeneralizationOperation,
  isCreateRelationshipOperation,
  isDeleteEntityOperation,
  isModifyClassOperation,
  isModifyGeneralizationOperation,
  isModifyRelationOperation,
} from "@dataspecer/core-v2/semantic-model/operations";
import {
  DataPsmCreateAttribute,
  DataPsmCreateClass,
  DataPsmDeleteClass,
  DataPsmSetCardinality,
  DataPsmSetHumanLabel,
} from "@dataspecer/core/data-psm/operation";
import { isStructureOperation } from "../types";
import { CreateClassOperationView } from "./semantic/create-class";
import { ModifyClassOperationView } from "./semantic/modify-class";
import { CreateRelationshipOperationView } from "./semantic/create-relationship";
import { ModifyRelationOperationView } from "./semantic/modify-relationship";
import { CreateGeneralizationOperationView } from "./semantic/create-generalization";
import { ModifyGeneralizationOperationView } from "./semantic/modify-generalization";
import { DeleteEntityOperationView } from "./semantic/delete-entity";
import { DataPsmCreateClassView } from "./structure/create-class";
import { DataPsmDeleteClassView } from "./structure/delete-class";
import { DataPsmSetHumanLabelView } from "./structure/set-human-label";
import { DataPsmCreateAttributeView } from "./structure/create-attribute";
import { DataPsmSetCardinalityView } from "./structure/set-cardinality";
import { GenericOperationView } from "./generic-operation";
import type { Operation } from "@dataspecer/core/operation";

/**
 * Picks the React component responsible for rendering a single operation,
 * based on its concrete type. Add a case here whenever a new operation type
 * gets a dedicated component; everything else falls back to
 * {@link GenericOperationView}.
 */
export function OperationRenderer({ operation }: { operation: Operation }) {
  if (isStructureOperation(operation)) {
    if (DataPsmCreateClass.is(operation)) return <DataPsmCreateClassView operation={operation} />;
    if (DataPsmDeleteClass.is(operation)) return <DataPsmDeleteClassView operation={operation} />;
    if (DataPsmSetHumanLabel.is(operation)) return <DataPsmSetHumanLabelView operation={operation} />;
    if (DataPsmCreateAttribute.is(operation)) return <DataPsmCreateAttributeView operation={operation} />;
    if (DataPsmSetCardinality.is(operation)) return <DataPsmSetCardinalityView operation={operation} />;
    return <GenericOperationView operation={operation} />;
  }

  if (isCreateClassOperation(operation)) return <CreateClassOperationView operation={operation} />;
  if (isModifyClassOperation(operation)) return <ModifyClassOperationView operation={operation} />;
  if (isCreateRelationshipOperation(operation)) return <CreateRelationshipOperationView operation={operation} />;
  if (isModifyRelationOperation(operation)) return <ModifyRelationOperationView operation={operation} />;
  if (isCreateGeneralizationOperation(operation)) return <CreateGeneralizationOperationView operation={operation} />;
  if (isModifyGeneralizationOperation(operation)) return <ModifyGeneralizationOperationView operation={operation} />;
  if (isDeleteEntityOperation(operation)) return <DeleteEntityOperationView operation={operation} />;
  return <GenericOperationView operation={operation} />;
}

/**
 * Translation key for the human-readable title of an operation's type,
 * shown above the operation-specific rendering.
 */
export function getOperationTitleKey(operation: Operation): string {
  if (isStructureOperation(operation)) {
    if (DataPsmCreateClass.is(operation)) return "operations.titles.structure-create-class";
    if (DataPsmDeleteClass.is(operation)) return "operations.titles.structure-delete-class";
    if (DataPsmSetHumanLabel.is(operation)) return "operations.titles.structure-set-human-label";
    if (DataPsmCreateAttribute.is(operation)) return "operations.titles.structure-create-attribute";
    if (DataPsmSetCardinality.is(operation)) return "operations.titles.structure-set-cardinality";
    return "operations.titles.structure-generic";
  }

  if (isCreateClassOperation(operation)) return "operations.titles.semantic-create-class";
  if (isModifyClassOperation(operation)) return "operations.titles.semantic-modify-class";
  if (isCreateRelationshipOperation(operation)) return "operations.titles.semantic-create-relationship";
  if (isModifyRelationOperation(operation)) return "operations.titles.semantic-modify-relationship";
  if (isCreateGeneralizationOperation(operation)) return "operations.titles.semantic-create-generalization";
  if (isModifyGeneralizationOperation(operation)) return "operations.titles.semantic-modify-generalization";
  if (isDeleteEntityOperation(operation)) return "operations.titles.semantic-delete-entity";
  return "operations.titles.semantic-generic";
}
