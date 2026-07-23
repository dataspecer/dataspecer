import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { modelTypeDisplay, pickLanguageString } from "@/lib/model-display";
import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import {
  RemoveEntityOperationType,
  SetEntityOperationType,
  UNDO_OPERATION_TYPE,
  UpdateEntityOperationType,
  VERSION_OPERATION_TYPE,
  type Operation,
  type RemoveEntityOperation,
  type SetEntityOperation,
  type UndoOperation,
  type UpdateEntityOperation,
  type VersionOperation,
} from "@dataspecer/core/operation";
import { isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship, type SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import {
  CREATE_CLASS_OPERATION,
  CREATE_GENERALIZATION_OPERATION,
  CREATE_RELATIONSHIP_OPERATION,
  DELETE_ENTITY_OPERATION,
  isModifyRelationOperation,
  MODIFY_CLASS_OPERATION,
  MODIFY_GENERALIZATION_OPERATION,
  MODIFY_RELATIONSHIP_END_OPERATION,
  MODIFY_RELATIONSHIP_OPERATION,
  type CreateClassOperation,
  type CreateGeneralizationOperation,
  type CreateRelationshipOperation,
  type DeleteEntityOperation,
  type ModifyClassOperation,
  type ModifyGeneralizationOperation,
  type ModifyRelationEndOperation,
  type ModifyRelationOperation,
} from "@dataspecer/core-v2/semantic-model/operations";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  ADD_CONTROLLED_VOCABULARY_ASSIGNMENT,
  CREATE_SEMANTIC_MODEL_CLASS_PROFILE,
  CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE,
  isModifySemanticModelRelationshipProfile,
  MODIFY_CONTROLLED_VOCABULARY_ASSIGNMENT,
  MODIFY_SEMANTIC_MODEL_CLASS_PROFILE,
  MODIFY_SEMANTIC_MODEL_RELATIONSHIP_END_PROFILE,
  MODIFY_SEMANTIC_MODEL_RELATIONSHIP_PROFILE,
  REMOVE_CONTROLLED_VOCABULARY_ASSIGNMENT,
  type AddControlledVocabularyAssignment,
  type CreateSemanticModelClassProfile,
  type CreateSemanticModelRelationshipProfile,
  type ModifyControlledVocabularyAssignment,
  type ModifySemanticModelClassProfile,
  type ModifySemanticModelRelationshipEndProfile,
  type ModifySemanticModelRelationshipProfile,
  type RemoveControlledVocabularyAssignment,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import { AddQueryOperationType, ReloadModelOperationType, RemoveQueryOperationType, SetModelUrlsOperationType } from "@dataspecer/model-store/implementation";
import { CreateModelOperationType, RemoveModelOperationType, type CreateModelOperation, type ProjectModelEntity, type RemoveModelOperation } from "@dataspecer/project-model";
import {
  AddVisualDiagramNodeOperationType,
  AddVisualGroupOperationType,
  AddVisualNodeOperationType,
  AddVisualProfileRelationshipOperationType,
  AddVisualRelationshipOperationType,
  DeleteModelColorOperationType,
  DeleteVisualEntityOperationType,
  isVisualDiagramNode,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  SetLabelOperationType,
  SetModelColorOperationType,
  SetViewOperationType,
  UpdateVisualEntityOperationType,
  type AddVisualDiagramNodeOperation,
  type AddVisualNodeOperation,
  type AddVisualRelationshipOperation,
  type DeleteModelColorOperation,
  type DeleteVisualEntityOperation,
  type Position,
  type SetLabelOperation,
  type SetModelColorOperation,
  type UpdateVisualEntityOperation,
} from "@dataspecer/visual-model";
import * as PSM from "@dataspecer/core/data-psm/data-psm-vocabulary";
import {
  CircleHelp,
  Move,
  PackageMinus,
  PackagePlus,
  Palette,
  Pencil,
  Plus,
  Replace,
  Tag,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { generalizationText, relationshipText, SemanticEntityName } from "./text-utils";

/**
 * To render a single operation row, that describes what happened, we need the
 * operation itself. For most operations, before and after entity record is
 * provided. Currently these two snapshots are before and after a transaction,
 * not this operation, but this is something that caller should be aware of. For
 * some cases contextBefore and contextAfter is provided, which is a snapshot of
 * aggregated model state before and after.
 *
 * Use contextBefore and contextAfter for profiles mainly, because we need
 * effective state.
 */
export interface OperationRowProps {
  modelId: ModelIdentifier;

  operation: Operation;

  before: EntityRecord;
  after: EntityRecord;

  contextBefore: EntityRecord;
  contextAfter: EntityRecord;
}

export function OperationRow(props: OperationRowProps) {
  const Component = OPERATION_ROWS[props.operation.type] ?? UnknownOperationRow;
  return <Component {...props} />;
}

// #region Helper functions

function relationshipEnds(entity: SemanticModelRelationship): { domainId: string | undefined; rangeId: string | undefined } {
  const rangeIndex = entity.ends[0]?.iri != null ? 0 : 1;
  return { domainId: entity.ends[1 - rangeIndex]?.concept ?? undefined, rangeId: entity.ends[rangeIndex]?.concept ?? undefined };
}

// #endregion Helper functions

// #region Shared rendering helpers

function formatOperationData(operation: object): string {
  const OPERATION_DATA_LIMIT = 3000;
  const json = JSON.stringify(operation, null, 2);
  return json.length > OPERATION_DATA_LIMIT ? `${json.slice(0, OPERATION_DATA_LIMIT)}…` : json;
}

/**
 * A row's outer shell: icon, the row's own content, and the raw operation
 * JSON behind a popover for anyone who needs to see exactly what happened.
 * Each operation component picks its own icon and color directly.
 */
function Row({ icon: Icon, colorClass, operation, children }: { icon: LucideIcon; colorClass: string; operation: Operation; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <li className="flex cursor-pointer items-center gap-2 text-sm">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} />
          <span className="flex min-w-0 items-center gap-2 truncate">{children}</span>
        </li>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="max-w-lg p-0">
        <div className="max-h-72 overflow-auto p-3">
          <p className="mb-1 font-mono text-[10px] text-muted-foreground">{typeof operation.type === "string" ? operation.type : ""}</p>
          <pre className="whitespace-pre-wrap break-all font-mono text-[10px] leading-snug">{formatOperationData(operation)}</pre>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColorSwatch({ color }: { color: string }) {
  return <span className="h-3 w-3 shrink-0 rounded-sm border border-border" style={{ backgroundColor: color }} />;
}

/**
 * Property names of a partial payload, without the identifiers — shown as a gray detail next to a "modify" phrase.
 */
function changedFields(payload: object): string[] {
  return Object.keys(payload).filter((key) => key !== "id" && key !== "type");
}

function ChangedFields({ fields }: { fields: string[] }) {
  const { t } = useTranslation();
  if (fields.length === 0) return null;
  const text = fields.map((field) => t(`history.field.${field}`, { defaultValue: humanizeTypeName(field).toLowerCase() })).join(", ");
  return <span className="truncate text-xs text-muted-foreground">({text})</span>;
}

/**
 * "SetJsonLdDefinedPrefixes" / "set-urls" -> "Set json ld defined prefixes".
 */
function humanizeTypeName(type: string): string {
  const segment = type.split("/").pop() ?? type;
  const words = segment
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatPosition(position: Position): string {
  return `(${Math.round(position.x)}, ${Math.round(position.y)})`;
}

// #endregion Shared rendering helpers

// #region History and version control

function UndoRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  const op = operation as UndoOperation;
  return (
    <Row icon={Undo2} colorClass="text-orange-600 dark:text-orange-400" operation={operation}>
      <span className="truncate">{t("history.op.undo", { transactionId: op.cancelTransactionId })}</span>
    </Row>
  );
}

function VersionRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  const op = operation as VersionOperation;
  return (
    <Row icon={Tag} colorClass="text-purple-600 dark:text-purple-400" operation={operation}>
      <span className="truncate">{t("history.op.version", { transactionId: op.versionedTransactionId, version: op.version })}</span>
    </Row>
  );
}

// #endregion History and version control

// #region Project structure

/** The project model's own entity record names/types the model an operation refers to — always available directly, since these operations are recorded against the project model itself. */
function projectModelLabel(entities: EntityRecord, modelId: string, language: string, t: (key: string) => string): { name: string | null; typeName: string } {
  const entity = entities[modelId] as ProjectModelEntity | undefined;
  const typeKey = modelTypeDisplay(entity?.modelType).typeKey;
  return { name: entity ? pickLanguageString(entity.label, language) : null, typeName: t(`model-type.${typeKey}`) };
}

function CreateModelRow({ operation, after }: OperationRowProps) {
  const { t, i18n } = useTranslation();
  const op = operation as CreateModelOperation;
  const { name, typeName } = projectModelLabel(after, op.modelId, i18n.language, t);
  return (
    <Row icon={PackagePlus} colorClass="text-amber-700 dark:text-amber-400" operation={operation}>
      <span className="truncate">{t("history.op.create-model", { type: typeName, name: name ?? t("history.unnamed") })}</span>
    </Row>
  );
}

function RemoveModelRow({ operation, before }: OperationRowProps) {
  const { t, i18n } = useTranslation();
  const op = operation as RemoveModelOperation;
  const { name, typeName } = projectModelLabel(before, op.modelId, i18n.language, t);
  return (
    <Row icon={PackageMinus} colorClass="text-amber-700 dark:text-amber-400" operation={operation}>
      <span className="truncate">{t("history.op.remove-model", { type: typeName, name: name ?? t("history.unnamed") })}</span>
    </Row>
  );
}

// #endregion Project structure

// #region Semantic model: vocabularies

function CreateClassRow({ operation, after }: OperationRowProps) {
  const op = operation as CreateClassOperation;
  const name = <SemanticEntityName entityId={op.entity.id} entities={after} />;
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.create-class" components={{ name }} />
      </span>
    </Row>
  );
}

function ModifyClassRow({ operation, before }: OperationRowProps) {
  const op = operation as ModifyClassOperation;
  const name = <SemanticEntityName entityId={op.entity.id} entities={before} />;
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.modify-class" components={{ name }} />
      </span>
      <ChangedFields fields={changedFields(op.entity)} />
    </Row>
  );
}

function CreateRelationshipRow({ operation, after }: OperationRowProps) {
  const op = operation as CreateRelationshipOperation;
  const entity = after[op.entity.id];
  const { domainId, rangeId } = isSemanticModelRelationship(entity) ? relationshipEnds(entity) : { domainId: undefined, rangeId: undefined };
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">{relationshipText("history.op.create-relationship", op.entity.id, domainId, rangeId, after)}</span>
    </Row>
  );
}

function ModifyRelationshipRow({ operation, before }: OperationRowProps) {
  const entityId = isModifyRelationOperation(operation) ? (operation as ModifyRelationOperation).entity.id : (operation as ModifyRelationEndOperation).entityId;
  const name = <SemanticEntityName entityId={entityId} entities={before} />;
  const fields = isModifyRelationOperation(operation)
    ? changedFields((operation as ModifyRelationOperation).entity)
    : changedFields((operation as ModifyRelationEndOperation).end);
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.modify-relationship" components={{ name }} />
      </span>
      <ChangedFields fields={fields} />
    </Row>
  );
}

function CreateGeneralizationRow({ operation, contextAfter }: OperationRowProps) {
  const { t } = useTranslation();
  console.log("generalization row", contextAfter);
  const op = operation as CreateGeneralizationOperation;
  const entity = contextAfter[op.entity.id];
  const childId = isSemanticModelGeneralization(entity) ? entity.child : "";
  const parentId = isSemanticModelGeneralization(entity) ? entity.parent : "";
  if (!childId || !parentId) {
    return (
      <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
        <span className="truncate">{t("history.op.create-generalization-plain")}</span>
      </Row>
    );
  }
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">{generalizationText("history.op.create-generalization", childId, parentId, contextAfter)}</span>
    </Row>
  );
}

function ModifyGeneralizationRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  const op = operation as ModifyGeneralizationOperation;
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">{t("history.op.modify-generalization")}</span>
      <ChangedFields fields={changedFields(op.entity)} />
    </Row>
  );
}

const DELETE_ENTITY_PHRASE: Record<string, string> = {
  "class": "delete-class",
  "relationship": "delete-relationship",
  "generalization": "delete-generalization",
  "class-profile": "delete-class-profile",
  "relationship-profile": "delete-relationship-profile",
};

function DeleteEntityRow({ operation, before, contextBefore }: OperationRowProps) {
  const op = operation as DeleteEntityOperation;
  const entity = before[op.entityId];

  if (!entity) {
    return (
      <Row icon={Trash2} colorClass="text-red-600 dark:text-red-400" operation={operation}>
        <span className="truncate">
          <Trans i18nKey="history.op.delete-entity" components={{ name: <SemanticEntityName entityId={op.entityId} entities={before} /> }} />
        </span>
      </Row>
    );
  }

  if (isSemanticModelClassProfile(entity) || isSemanticModelRelationshipProfile(entity)) {
    const kind = isSemanticModelClassProfile(entity) ? "class-profile" : "relationship-profile";
    const name = <SemanticEntityName entityId={op.entityId} entities={contextBefore} />;
    return (
      <Row icon={Trash2} colorClass="text-red-600 dark:text-red-400" operation={operation}>
        <span className="truncate">
          <Trans i18nKey={`history.op.${DELETE_ENTITY_PHRASE[kind]}`} components={{ name }} />
        </span>
      </Row>
    );
  }

  if (isSemanticModelRelationship(entity)) {
    const { domainId, rangeId } = relationshipEnds(entity);
    return (
      <Row icon={Trash2} colorClass="text-red-600 dark:text-red-400" operation={operation}>
        <span className="truncate">{relationshipText("history.op.delete-relationship", op.entityId, domainId, rangeId, before)}</span>
      </Row>
    );
  }

  if (isSemanticModelGeneralization(entity)) {
    return (
      <Row icon={Trash2} colorClass="text-red-600 dark:text-red-400" operation={operation}>
        <span className="truncate">{generalizationText("history.op.delete-generalization", entity.child, entity.parent, before)}</span>
      </Row>
    );
  }

  const name = <SemanticEntityName entityId={op.entityId} entities={before} />;
  const phrase = isSemanticModelClass(entity) ? DELETE_ENTITY_PHRASE["class"]! : "delete-entity";
  return (
    <Row icon={Trash2} colorClass="text-red-600 dark:text-red-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey={`history.op.${phrase}`} components={{ name }} />
      </span>
    </Row>
  );
}

// #endregion Semantic model: vocabularies

// #region Semantic model: application profiles

function CreateClassProfileRow({ operation, contextAfter }: OperationRowProps) {
  const op = operation as CreateSemanticModelClassProfile;
  const name = <SemanticEntityName entityId={op.entity.id} entities={contextAfter} />;
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.create-class-profile" components={{ name }} />
      </span>
    </Row>
  );
}

function ModifyClassProfileRow({ operation, contextBefore }: OperationRowProps) {
  const op = operation as ModifySemanticModelClassProfile;
  const name = <SemanticEntityName entityId={op.identifier} entities={contextBefore} />;
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.modify-class-profile" components={{ name }} />
      </span>
      <ChangedFields fields={changedFields(op.entity)} />
    </Row>
  );
}

function CreateRelationshipProfileRow({ operation, contextAfter }: OperationRowProps) {
  const op = operation as CreateSemanticModelRelationshipProfile;
  const name = <SemanticEntityName entityId={op.entity.id} entities={contextAfter} />;
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.create-relationship-profile" components={{ name }} />
      </span>
    </Row>
  );
}

function ModifyRelationshipProfileRow({ operation, contextBefore }: OperationRowProps) {
  const identifier = isModifySemanticModelRelationshipProfile(operation)
    ? (operation as ModifySemanticModelRelationshipProfile).identifier
    : (operation as ModifySemanticModelRelationshipEndProfile).identifier;
  const name = <SemanticEntityName entityId={identifier} entities={contextBefore} />;
  const fields = isModifySemanticModelRelationshipProfile(operation)
    ? changedFields((operation as ModifySemanticModelRelationshipProfile).entity)
    : changedFields((operation as ModifySemanticModelRelationshipEndProfile).end);
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.modify-relationship-profile" components={{ name }} />
      </span>
      <ChangedFields fields={fields} />
    </Row>
  );
}

function AssignControlledVocabularyRow({ operation, contextBefore }: OperationRowProps) {
  const op = operation as AddControlledVocabularyAssignment;
  const name = <SemanticEntityName entityId={op.classProfileIdentifier} entities={contextBefore} />;
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.assign-controlled-vocabulary" components={{ name }} />
      </span>
    </Row>
  );
}

function RemoveControlledVocabularyRow({ operation, contextBefore }: OperationRowProps) {
  const op = operation as RemoveControlledVocabularyAssignment;
  const name = <SemanticEntityName entityId={op.classProfileIdentifier} entities={contextBefore} />;
  return (
    <Row icon={Trash2} colorClass="text-red-600 dark:text-red-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.remove-controlled-vocabulary" components={{ name }} />
      </span>
    </Row>
  );
}

function ModifyControlledVocabularyRow({ operation, contextBefore }: OperationRowProps) {
  const op = operation as ModifyControlledVocabularyAssignment;
  const name = <SemanticEntityName entityId={op.classProfileIdentifier} entities={contextBefore} />;
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.modify-controlled-vocabulary" components={{ name }} />
      </span>
    </Row>
  );
}

// #endregion Semantic model: application profiles

// #region Visual model: the canvas

function AddVisualNodeRow({ operation, contextAfter }: OperationRowProps) {
  const op = operation as AddVisualNodeOperation;
  const name = <SemanticEntityName entityId={op.entity.representedEntity} entities={contextAfter} />;
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.add-visual-node" components={{ name }} />
      </span>
    </Row>
  );
}

function AddVisualDiagramNodeRow({ operation, contextAfter }: OperationRowProps) {
  const { t, i18n } = useTranslation();
  const op = operation as AddVisualDiagramNodeOperation;
  const { name, typeName } = projectModelLabel(contextAfter, op.entity.representedVisualModel, i18n.language, t);
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">{t("history.op.add-visual-diagram-node", { name: name ?? typeName })}</span>
    </Row>
  );
}

function AddVisualRelationshipRow({ operation, contextAfter }: OperationRowProps) {
  const op = operation as AddVisualRelationshipOperation;
  const name = <SemanticEntityName entityId={op.entity.representedRelationship} entities={contextAfter} />;
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.add-visual-relationship" components={{ name }} />
      </span>
    </Row>
  );
}

function AddVisualProfileRelationshipRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">{t("history.op.add-visual-profile-relationship")}</span>
    </Row>
  );
}

function AddVisualGroupRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">{t("history.op.add-visual-group")}</span>
    </Row>
  );
}

function representedEntityIdOf(entity: Entity | undefined): string | undefined {
  if (!entity) return undefined;
  if (isVisualDiagramNode(entity)) return entity.representedVisualModel;
  if (isVisualRelationship(entity)) return entity.representedRelationship;
  if (isVisualProfileRelationship(entity)) return entity.entity;
  return (entity as { representedEntity?: string }).representedEntity;
}

function UpdateVisualEntityRow({ operation, before, contextBefore }: OperationRowProps) {
  const op = operation as UpdateVisualEntityOperation;
  const entity = before[op.entityId];
  const name = <SemanticEntityName entityId={representedEntityIdOf(entity)} entities={contextBefore} />;
  const updates = op.updates ?? {};

  if ("position" in updates && updates.position && typeof updates.position === "object") {
    const to = updates.position as Position;
    const from = (entity as { position?: Position } | undefined)?.position;
    return (
      <Row icon={Move} colorClass="text-indigo-600 dark:text-indigo-400" operation={operation}>
        <span className="truncate">
          {from ? (
            <Trans i18nKey="history.op.move-node" values={{ from: formatPosition(from), to: formatPosition(to) }} components={{ name }} />
          ) : (
            <Trans i18nKey="history.op.move-node-to" values={{ to: formatPosition(to) }} components={{ name }} />
          )}
        </span>
      </Row>
    );
  }
  if ("waypoints" in updates) {
    return (
      <Row icon={Move} colorClass="text-indigo-600 dark:text-indigo-400" operation={operation}>
        <span className="truncate">
          <Trans i18nKey="history.op.reroute-edge" components={{ name }} />
        </span>
      </Row>
    );
  }
  if ("content" in updates) {
    return (
      <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
        <span className="truncate">
          <Trans i18nKey="history.op.change-node-content" components={{ name }} />
        </span>
      </Row>
    );
  }
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.update-visual-entity" components={{ name }} />
      </span>
      <ChangedFields fields={changedFields(updates)} />
    </Row>
  );
}

function DeleteVisualEntityRow({ operation, before, contextBefore }: OperationRowProps) {
  const op = operation as DeleteVisualEntityOperation;
  const entity = before[op.entityId];
  const name = <SemanticEntityName entityId={representedEntityIdOf(entity)} entities={contextBefore} />;
  const phrase =
    entity && (isVisualRelationship(entity) || isVisualProfileRelationship(entity))
      ? "remove-visual-relationship"
      : entity && (isVisualNode(entity) || isVisualDiagramNode(entity))
        ? "remove-visual-node"
        : "remove-visual-entity";
  return (
    <Row icon={Trash2} colorClass="text-red-600 dark:text-red-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey={`history.op.${phrase}`} components={{ name }} />
      </span>
    </Row>
  );
}

function SetModelColorRow({ operation, contextAfter }: OperationRowProps) {
  const { t, i18n } = useTranslation();
  const op = operation as SetModelColorOperation;
  const { name, typeName } = projectModelLabel(contextAfter, op.modelId, i18n.language, t);
  const modelName = name ?? typeName;
  if (op.color === null) {
    return (
      <Row icon={Palette} colorClass="text-fuchsia-600 dark:text-fuchsia-400" operation={operation}>
        <span className="truncate">{t("history.op.remove-model-color", { name: modelName })}</span>
      </Row>
    );
  }
  return (
    <Row icon={Palette} colorClass="text-fuchsia-600 dark:text-fuchsia-400" operation={operation}>
      <span className="truncate">{t("history.op.set-model-color", { name: modelName })}</span>
      <ColorSwatch color={op.color} />
    </Row>
  );
}

function DeleteModelColorRow({ operation, contextBefore }: OperationRowProps) {
  const { t, i18n } = useTranslation();
  const op = operation as DeleteModelColorOperation;
  const { name, typeName } = projectModelLabel(contextBefore, op.modelId, i18n.language, t);
  return (
    <Row icon={Palette} colorClass="text-fuchsia-600 dark:text-fuchsia-400" operation={operation}>
      <span className="truncate">{t("history.op.remove-model-color", { name: name ?? typeName })}</span>
    </Row>
  );
}

function SetLabelRow({ operation }: OperationRowProps) {
  const { t, i18n } = useTranslation();
  const op = operation as SetLabelOperation;
  const name = pickLanguageString(op.label, i18n.language);
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">{t("history.op.rename-view", { name: name ?? t("history.unnamed") })}</span>
    </Row>
  );
}

function SetViewRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Palette} colorClass="text-fuchsia-600 dark:text-fuchsia-400" operation={operation}>
      <span className="truncate">{t("history.op.set-view")}</span>
    </Row>
  );
}

// #endregion Visual model: the canvas

// #region Async queryable model operations

function ReloadModelRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Replace} colorClass="text-sky-600 dark:text-sky-400" operation={operation}>
      <span className="truncate">{t("history.op.reload-model")}</span>
    </Row>
  );
}

function SetModelUrlsRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">{t("history.op.set-model-urls")}</span>
    </Row>
  );
}

function AddQueryRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">{t("history.op.add-query")}</span>
    </Row>
  );
}

function RemoveQueryRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Trash2} colorClass="text-red-600 dark:text-red-400" operation={operation}>
      <span className="truncate">{t("history.op.remove-query")}</span>
    </Row>
  );
}

// #endregion Async queryable model operations

// #region Structure model operations

const PSM_CREATE_TYPES: Record<string, string> = {
  [PSM.CREATE_CLASS]: "class",
  [PSM.CREATE_ATTRIBUTE]: "attribute",
  [PSM.CREATE_ASSOCIATION_END]: "association",
  [PSM.CREATE_OR]: "choice",
  [PSM.CREATE_CONTAINER]: "container",
  [PSM.CREATE_INCLUDE]: "include",
  [PSM.CREATE_CLASS_REFERENCE]: "class-reference",
  [PSM.CREATE_EXTERNAL_ROOT]: "external-root",
};

const PSM_DELETE_TYPES: Record<string, string> = {
  [PSM.DELETE_CLASS]: "class",
  [PSM.DELETE_ATTRIBUTE]: "attribute",
  [PSM.DELETE_ASSOCIATION_END]: "association",
  [PSM.DELETE_OR]: "choice",
  [PSM.DELETE_CONTAINER]: "container",
  [PSM.DELETE_INCLUDE]: "include",
  [PSM.DELETE_CLASS_REFERENCE]: "class-reference",
  [PSM.DELETE_EXTERNAL_ROOT]: "external-root",
};

const PSM_GENERIC_SET_TYPES = [
  PSM.SET_CARDINALITY,
  PSM.SET_CHOICE,
  PSM.SET_DATATYPE,
  PSM.SET_EXTERNAL_ROOT_TYPES,
  PSM.SET_HUMAN_DESCRIPTION,
  PSM.SET_PROFILING,
  PSM.SET_ID_TYPE,
  PSM.SET_INSTANCES_HAVE_IDENTITY,
  PSM.SET_INSTANCES_SPECIFY_TYPES,
  PSM.SET_INTERPRETATION,
  PSM.SET_IS_CLOSED,
  PSM.SET_EMPTY_AS_COMPLEX,
  PSM.SET_PART,
  PSM.SET_ROOT_COLLECTION,
  PSM.SET_MATERIALIZED,
  PSM.SET_ROOTS,
  PSM.SET_JSON_ENFORCE_CONTEXT,
  PSM.SET_JSON_LD_DEFINED_PREFIXES,
  PSM.SET_JSON_LD_TYPE_MAPPING,
  PSM.SET_JSON_SCHEMA_PREFIXES_IN_IRI_REGEX,
  PSM.UNSET_CHOICE,
];

function PsmCreateRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  const partKey = PSM_CREATE_TYPES[operation.type] ?? "class";
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">{t("history.op.psm-create", { what: t(`history.psm-part.${partKey}`) })}</span>
    </Row>
  );
}

function PsmDeleteRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  const partKey = PSM_DELETE_TYPES[operation.type] ?? "class";
  return (
    <Row icon={Trash2} colorClass="text-red-600 dark:text-red-400" operation={operation}>
      <span className="truncate">{t("history.op.psm-delete", { what: t(`history.psm-part.${partKey}`) })}</span>
    </Row>
  );
}

function PsmGenericSetRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  const suffix = operation.type.slice(operation.type.lastIndexOf("/") + 1);
  const what = humanizeTypeName(suffix.replace(/^(Set|Unset)/, "")).toLowerCase();
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">{t("history.op.psm-set", { what })}</span>
    </Row>
  );
}

function PsmCreateSchemaRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Plus} colorClass="text-green-600 dark:text-green-400" operation={operation}>
      <span className="truncate">{t("history.op.psm-create-schema")}</span>
    </Row>
  );
}

function PsmMovePropertyRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Move} colorClass="text-indigo-600 dark:text-indigo-400" operation={operation}>
      <span className="truncate">{t("history.op.psm-move-property")}</span>
    </Row>
  );
}

function PsmSetOrderRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Move} colorClass="text-indigo-600 dark:text-indigo-400" operation={operation}>
      <span className="truncate">{t("history.op.psm-set-order")}</span>
    </Row>
  );
}

function PsmSetHumanLabelRow({ operation }: OperationRowProps) {
  const { t, i18n } = useTranslation();
  const label = (operation as Operation & Record<string, unknown>).dataPsmHumanLabel;
  const name = pickLanguageString(label, i18n.language);
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">{t("history.op.psm-set-human-label", { name: name ?? t("history.unnamed") })}</span>
    </Row>
  );
}

function PsmSetTechnicalLabelRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  const value = (operation as Operation & Record<string, unknown>).dataPsmTechnicalLabel;
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">{t("history.op.psm-set-technical-label", { value: typeof value === "string" ? value : "?" })}</span>
    </Row>
  );
}

function PsmReplaceAlongInheritanceRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">{t("history.op.psm-replace-along-inheritance")}</span>
    </Row>
  );
}

function PsmWrapWithOrRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">{t("history.op.psm-wrap-with-or")}</span>
    </Row>
  );
}

function PsmUnwrapOrRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">{t("history.op.psm-unwrap-or")}</span>
    </Row>
  );
}

// #endregion Structure model operations

// #region Base operations

function SetEntityRow({ operation, contextBefore }: OperationRowProps) {
  const op = operation as SetEntityOperation;
  const name = <SemanticEntityName entityId={op.entity.id} entities={contextBefore} />;
  return (
    <Row icon={Replace} colorClass="text-sky-600 dark:text-sky-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.set-entity" components={{ name }} />
      </span>
    </Row>
  );
}

function UpdateEntityRow({ operation, contextBefore }: OperationRowProps) {
  const op = operation as UpdateEntityOperation;
  const name = <SemanticEntityName entityId={op.update.id} entities={contextBefore} />;
  return (
    <Row icon={Pencil} colorClass="text-blue-600 dark:text-blue-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.update-entity" components={{ name }} />
      </span>
      <ChangedFields fields={changedFields(op.update)} />
    </Row>
  );
}

function RemoveEntityRow({ operation, contextBefore }: OperationRowProps) {
  const op = operation as RemoveEntityOperation;
  const name = <SemanticEntityName entityId={op.entityId} entities={contextBefore} />;
  return (
    <Row icon={Trash2} colorClass="text-red-600 dark:text-red-400" operation={operation}>
      <span className="truncate">
        <Trans i18nKey="history.op.remove-entity" components={{ name }} />
      </span>
    </Row>
  );
}

// #endregion Base operations

/**
 * Unknown operation, try to guess its type.
 */
function UnknownOperationRow({ operation }: OperationRowProps) {
  const { t } = useTranslation();
  const type = typeof operation.type === "string" ? operation.type : "";
  const [icon, colorClass] =
    type.includes("create") || type.includes("add")
      ? ([Plus, "text-green-600 dark:text-green-400"] as const)
      : type.includes("delete") || type.includes("remove")
        ? ([Trash2, "text-red-600 dark:text-red-400"] as const)
        : type.includes("modify") || type.includes("update") || type.includes("set")
          ? ([Pencil, "text-blue-600 dark:text-blue-400"] as const)
          : ([CircleHelp, "text-muted-foreground"] as const);
  return (
    <Row icon={icon} colorClass={colorClass} operation={operation}>
      <span className="truncate">{t("history.op.generic", { text: type === "" ? "?" : humanizeTypeName(type) })}</span>
    </Row>
  );
}

/**
 * Operation type to React component that renders the operation.
 */
const OPERATION_ROWS: Record<string, ComponentType<OperationRowProps>> = {
  // History and version control.
  [UNDO_OPERATION_TYPE]: UndoRow,
  [VERSION_OPERATION_TYPE]: VersionRow,

  // Project structure.
  [CreateModelOperationType]: CreateModelRow,
  [RemoveModelOperationType]: RemoveModelRow,

  // Semantic model: vocabularies.
  [CREATE_CLASS_OPERATION]: CreateClassRow,
  [MODIFY_CLASS_OPERATION]: ModifyClassRow,
  [CREATE_RELATIONSHIP_OPERATION]: CreateRelationshipRow,
  [MODIFY_RELATIONSHIP_OPERATION]: ModifyRelationshipRow,
  [MODIFY_RELATIONSHIP_END_OPERATION]: ModifyRelationshipRow,
  [CREATE_GENERALIZATION_OPERATION]: CreateGeneralizationRow,
  [MODIFY_GENERALIZATION_OPERATION]: ModifyGeneralizationRow,
  [DELETE_ENTITY_OPERATION]: DeleteEntityRow,

  // Semantic model: application profiles.
  [CREATE_SEMANTIC_MODEL_CLASS_PROFILE]: CreateClassProfileRow,
  [MODIFY_SEMANTIC_MODEL_CLASS_PROFILE]: ModifyClassProfileRow,
  [CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE]: CreateRelationshipProfileRow,
  [MODIFY_SEMANTIC_MODEL_RELATIONSHIP_PROFILE]: ModifyRelationshipProfileRow,
  [MODIFY_SEMANTIC_MODEL_RELATIONSHIP_END_PROFILE]: ModifyRelationshipProfileRow,
  [ADD_CONTROLLED_VOCABULARY_ASSIGNMENT]: AssignControlledVocabularyRow,
  [REMOVE_CONTROLLED_VOCABULARY_ASSIGNMENT]: RemoveControlledVocabularyRow,
  [MODIFY_CONTROLLED_VOCABULARY_ASSIGNMENT]: ModifyControlledVocabularyRow,

  // Visual model: the canvas.
  [AddVisualNodeOperationType]: AddVisualNodeRow,
  [AddVisualDiagramNodeOperationType]: AddVisualDiagramNodeRow,
  [AddVisualRelationshipOperationType]: AddVisualRelationshipRow,
  [AddVisualProfileRelationshipOperationType]: AddVisualProfileRelationshipRow,
  [AddVisualGroupOperationType]: AddVisualGroupRow,
  [UpdateVisualEntityOperationType]: UpdateVisualEntityRow,
  [DeleteVisualEntityOperationType]: DeleteVisualEntityRow,
  [SetModelColorOperationType]: SetModelColorRow,
  [DeleteModelColorOperationType]: DeleteModelColorRow,
  [SetLabelOperationType]: SetLabelRow,
  [SetViewOperationType]: SetViewRow,

  // Imported vocabulary (RDFS) and queryable (SGOV) models.
  [ReloadModelOperationType]: ReloadModelRow,
  [SetModelUrlsOperationType]: SetModelUrlsRow,
  [AddQueryOperationType]: AddQueryRow,
  [RemoveQueryOperationType]: RemoveQueryRow,

  // Generic entity operations, shared by every model.
  [SetEntityOperationType]: SetEntityRow,
  [UpdateEntityOperationType]: UpdateEntityRow,
  [RemoveEntityOperationType]: RemoveEntityRow,

  // Structure model (PSM).
  [PSM.CREATE_SCHEMA]: PsmCreateSchemaRow,
  [PSM.MOVE_PROPERTY]: PsmMovePropertyRow,
  [PSM.SET_ORDER]: PsmSetOrderRow,
  [PSM.SET_HUMAN_LABEL]: PsmSetHumanLabelRow,
  [PSM.SET_TECHNICAL_LABEL]: PsmSetTechnicalLabelRow,
  [PSM.REPLACE_ALONG_INHERITANCE]: PsmReplaceAlongInheritanceRow,
  [PSM.WRAP_WITH_OR]: PsmWrapWithOrRow,
  [PSM.UNWRAP_OR]: PsmUnwrapOrRow,
};
for (const type of Object.keys(PSM_CREATE_TYPES)) OPERATION_ROWS[type] = PsmCreateRow;
for (const type of Object.keys(PSM_DELETE_TYPES)) OPERATION_ROWS[type] = PsmDeleteRow;
for (const type of PSM_GENERIC_SET_TYPES) OPERATION_ROWS[type] = PsmGenericSetRow;
