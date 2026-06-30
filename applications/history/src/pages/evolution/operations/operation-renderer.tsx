import { useTranslation } from "react-i18next";
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

export function OperationRenderer({ operation, entities }: { operation: Operation; entities?: Record<string, any> }) {
  const { t } = useTranslation();

  if (isStructureOperation(operation)) {
    if (DataPsmCreateClass.is(operation)) return <DataPsmCreateClassView operation={operation} />;
    if (DataPsmDeleteClass.is(operation)) return <DataPsmDeleteClassView operation={operation} />;
    if (DataPsmSetHumanLabel.is(operation)) return <DataPsmSetHumanLabelView operation={operation} />;
    if (DataPsmCreateAttribute.is(operation)) return <DataPsmCreateAttributeView operation={operation} />;
    if (DataPsmSetCardinality.is(operation)) return <DataPsmSetCardinalityView operation={operation} />;
    return <GenericOperationView operation={operation} title={t("operations.titles.structure-generic")} />;
  }

  if (isCreateClassOperation(operation)) return <CreateClassOperationView operation={operation} />;
  if (isModifyClassOperation(operation)) return <ModifyClassOperationView operation={operation} entities={entities} />;
  if (isCreateRelationshipOperation(operation)) return <CreateRelationshipOperationView operation={operation} entities={entities} />;
  if (isModifyRelationOperation(operation)) return <ModifyRelationOperationView operation={operation} entities={entities} />;
  if (isCreateGeneralizationOperation(operation)) return <CreateGeneralizationOperationView operation={operation} entities={entities} />;
  if (isModifyGeneralizationOperation(operation)) return <ModifyGeneralizationOperationView operation={operation} entities={entities} />;
  if (isDeleteEntityOperation(operation)) return <DeleteEntityOperationView operation={operation} entities={entities} />;
  return <GenericOperationView operation={operation} title={t("operations.titles.semantic-generic")} />;
}
