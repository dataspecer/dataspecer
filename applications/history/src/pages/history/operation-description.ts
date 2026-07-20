import { V1 } from "@dataspecer/core-v2/model/known-models";
import {
  isCreateClassOperation,
  isCreateGeneralizationOperation,
  isCreateRelationshipOperation,
  isDeleteEntityOperation,
  isModifyClassOperation,
  isModifyGeneralizationOperation,
  isModifyRelationEndOperation,
  isModifyRelationOperation,
} from "@dataspecer/core-v2/semantic-model/operations";
import {
  isAddControlledVocabularyAssignment,
  isCreateSemanticModelClassProfile,
  isCreateSemanticModelRelationshipProfile,
  isModifyControlledVocabularyAssignment,
  isModifySemanticModelClassProfile,
  isModifySemanticModelRelationshipEndProfile,
  isModifySemanticModelRelationshipProfile,
  isRemoveControlledVocabularyAssignment,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import {
  isRemoveEntityOperation,
  isSetEntityOperation,
  isUndoOperation,
  isUpdateEntityOperation,
  isVersionOperation,
  type Operation,
  type OperationInModel,
} from "@dataspecer/core/operation";
import { ReloadModelOperationType, SetModelUrlsOperationType } from "@dataspecer/model-store/implementation";
import { isCreateModelOperation, isRemoveModelOperation } from "@dataspecer/project-model";
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
  type Position,
} from "@dataspecer/visual-model";
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
import { modelTypeDisplay } from "@/lib/model-display";

/**
 * Turns the recorded operations of the project history into human-readable
 * descriptions. The whole history is replayed chronologically so that names
 * and canvas positions known at the time of an operation can be used later —
 * a delete can name the deleted entity, a canvas move knows where the node
 * moved from — even when the entity no longer exists in the current models.
 */

// ---------------------------------------------------------------------------
// Categories: icon and color of an operation
// ---------------------------------------------------------------------------

export type OperationCategory =
  | "create"
  | "modify"
  | "delete"
  | "set"
  | "move"
  | "style"
  | "undo"
  | "version"
  | "create-model"
  | "remove-model"
  | "other";

export const CATEGORY_STYLE: Record<OperationCategory, { icon: LucideIcon; colorClass: string }> = {
  "create": { icon: Plus, colorClass: "text-green-600 dark:text-green-400" },
  "modify": { icon: Pencil, colorClass: "text-blue-600 dark:text-blue-400" },
  "delete": { icon: Trash2, colorClass: "text-red-600 dark:text-red-400" },
  "set": { icon: Replace, colorClass: "text-sky-600 dark:text-sky-400" },
  "move": { icon: Move, colorClass: "text-indigo-600 dark:text-indigo-400" },
  "style": { icon: Palette, colorClass: "text-fuchsia-600 dark:text-fuchsia-400" },
  "undo": { icon: Undo2, colorClass: "text-orange-600 dark:text-orange-400" },
  "version": { icon: Tag, colorClass: "text-purple-600 dark:text-purple-400" },
  "create-model": { icon: PackagePlus, colorClass: "text-amber-700 dark:text-amber-400" },
  "remove-model": { icon: PackageMinus, colorClass: "text-amber-700 dark:text-amber-400" },
  "other": { icon: CircleHelp, colorClass: "text-muted-foreground" },
};

// ---------------------------------------------------------------------------
// Description of one operation
// ---------------------------------------------------------------------------

export interface OperationDescription {
  category: OperationCategory;

  /** Translation key of the sentence, under `history.op.`. */
  phrase: string;

  /**
   * Interpolation params of the phrase. LanguageString values are resolved to
   * the UI language at render time.
   */
  params: Record<string, string | LanguageString>;

  /**
   * Params resolved by translating the given key at render time
   * (e.g. `type` of a created model, translated under `model-type.`).
   */
  paramKeys?: Record<string, string>;

  /**
   * Id of the entity the operation concerns. Never shown directly; used for
   * the details tooltip and as a last-resort name lookup in the current store.
   */
  targetId?: string;

  /** Id of a model whose display name fills the `name` param. */
  modelRef?: string;

  /** Transaction referenced by an undo/version operation; fills `time`. */
  refTransactionId?: string;

  /** Property names the operation changes, shown as a gray detail. */
  fields?: string[];

  /** Hex color rendered as a swatch next to the phrase. */
  swatch?: string;
}

/** "SetJsonLdDefinedPrefixes" / "set-urls" -> "Set json ld defined prefixes". */
export function humanizeTypeName(type: string): string {
  const segment = type.split("/").pop() ?? type;
  const words = segment
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// ---------------------------------------------------------------------------
// Replay state
// ---------------------------------------------------------------------------

/** What the history knows about an entity at a given point in time. */
interface EntityTrace {
  name?: LanguageString;
  kind?: "class" | "relationship" | "generalization" | "class-profile" | "relationship-profile";
}

/** What the history knows about a visual entity at a given point in time. */
interface VisualTrace {
  kind: "node" | "diagram-node" | "relationship" | "profile-relationship" | "group";
  /** Id of the represented (semantic) entity or visual model. */
  representedId?: string;
  position?: Position;
}

class ReplayState {
  /** modelId -> modelType, extended as create-model operations are replayed. */
  modelTypes: Record<string, string>;
  /** Labels of models, from operations on the project model. */
  modelLabels = new Map<string, LanguageString>();
  /** modelId -> entityId -> trace. */
  private entities = new Map<string, Map<string, EntityTrace>>();
  /** modelId -> visual entity id -> trace. */
  private visuals = new Map<string, Map<string, VisualTrace>>();

  constructor(initialModelTypes: Record<string, string>) {
    this.modelTypes = { ...initialModelTypes };
  }

  entity(modelId: string, entityId: string): EntityTrace {
    let model = this.entities.get(modelId);
    if (!model) this.entities.set(modelId, (model = new Map()));
    let trace = model.get(entityId);
    if (!trace) model.set(entityId, (trace = {}));
    return trace;
  }

  /** Trace of an entity in whatever model it lives in (profiled entities live upstream). */
  entityAnywhere(entityId: string): EntityTrace | undefined {
    for (const model of this.entities.values()) {
      const trace = model.get(entityId);
      if (trace) return trace;
    }
    return undefined;
  }

  visual(modelId: string, entityId: string, kind: VisualTrace["kind"] = "node"): VisualTrace {
    let model = this.visuals.get(modelId);
    if (!model) this.visuals.set(modelId, (model = new Map()));
    let trace = model.get(entityId);
    if (!trace) model.set(entityId, (trace = { kind }));
    return trace;
  }

  visualIfKnown(modelId: string, entityId: string): VisualTrace | undefined {
    return this.visuals.get(modelId)?.get(entityId);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isLanguageString = (value: unknown): value is LanguageString =>
  typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value as object).length > 0;

/** Name of a class-like or relationship-like entity payload. */
function nameFromPayload(payload: { name?: LanguageString | null; ends?: { name?: LanguageString | null }[] }): LanguageString | undefined {
  if (isLanguageString(payload.name)) return payload.name;
  const end = payload.ends?.find((end) => isLanguageString(end.name));
  return end?.name ?? undefined;
}

/** Property names of a partial payload, without the identifiers. */
function changedFields(payload: object): string[] {
  return Object.keys(payload).filter((key) => key !== "id" && key !== "type");
}

const formatPosition = (position: Position): string => `(${Math.round(position.x)}, ${Math.round(position.y)})`;

// ---------------------------------------------------------------------------
// The description of a single operation, updating the replay state
// ---------------------------------------------------------------------------

const AddQueryOperationType = "http://dataspecer.com/core/operation/add-query";
const RemoveQueryOperationType = "http://dataspecer.com/core/operation/remove-query";
const PSM_OPERATION_PREFIX = "https://ofn.gov.cz/slovník/psm/";

function describeOperation(modelId: string, operation: Operation, projectModelId: string, state: ReplayState): OperationDescription {
  // Operations on the history itself.
  if (isUndoOperation(operation)) {
    return { category: "undo", phrase: "undo", params: {}, refTransactionId: operation.cancelTransactionId };
  }
  if (isVersionOperation(operation)) {
    return { category: "version", phrase: "version", params: { version: operation.version }, refTransactionId: operation.versionedTransactionId };
  }

  // Operations on the project structure.
  if (isCreateModelOperation(operation)) {
    state.modelTypes[operation.modelId] = operation.modelType;
    return {
      category: "create-model",
      phrase: "create-model",
      params: {},
      paramKeys: { type: `model-type.${modelTypeDisplay(operation.modelType).typeKey}` },
      modelRef: operation.modelId,
      targetId: operation.modelId,
    };
  }
  if (isRemoveModelOperation(operation)) {
    return {
      category: "remove-model",
      phrase: "remove-model",
      params: {},
      paramKeys: { type: `model-type.${modelTypeDisplay(state.modelTypes[operation.modelId]).typeKey}` },
      modelRef: operation.modelId,
      targetId: operation.modelId,
    };
  }

  const isProjectModel = modelId.split("#")[0] === projectModelId;
  const modelType = state.modelTypes[modelId.split("#")[0]!];

  // Semantic model: vocabularies.
  if (isCreateClassOperation(operation)) {
    const trace = state.entity(modelId, operation.entity.id);
    trace.kind = "class";
    if (isLanguageString(operation.entity.name)) trace.name = operation.entity.name;
    return { category: "create", phrase: "create-class", params: trace.name ? { name: trace.name } : {}, targetId: operation.entity.id };
  }
  if (isModifyClassOperation(operation)) {
    const trace = state.entity(modelId, operation.entity.id);
    const params: OperationDescription["params"] = {};
    const name = (isLanguageString(operation.entity.name) ? operation.entity.name : undefined) ?? trace.name;
    if (name) params.name = name;
    if (isLanguageString(operation.entity.name)) trace.name = operation.entity.name;
    return { category: "modify", phrase: "modify-class", params, targetId: operation.entity.id, fields: changedFields(operation.entity) };
  }
  if (isCreateRelationshipOperation(operation)) {
    const trace = state.entity(modelId, operation.entity.id);
    trace.kind = "relationship";
    const name = nameFromPayload(operation.entity);
    if (name) trace.name = name;
    return { category: "create", phrase: "create-relationship", params: name ? { name } : {}, targetId: operation.entity.id };
  }
  if (isModifyRelationOperation(operation)) {
    const trace = state.entity(modelId, operation.entity.id);
    const name = nameFromPayload(operation.entity) ?? trace.name;
    if (name) trace.name = name;
    return {
      category: "modify",
      phrase: "modify-relationship",
      params: name ? { name } : {},
      targetId: operation.entity.id,
      fields: changedFields(operation.entity),
    };
  }
  if (isModifyRelationEndOperation(operation)) {
    const trace = state.entity(modelId, operation.entityId);
    const name = (isLanguageString(operation.end.name) ? operation.end.name : undefined) ?? trace.name;
    if (isLanguageString(operation.end.name)) trace.name = operation.end.name;
    return {
      category: "modify",
      phrase: "modify-relationship",
      params: name ? { name } : {},
      targetId: operation.entityId,
      fields: changedFields(operation.end),
    };
  }
  if (isCreateGeneralizationOperation(operation)) {
    state.entity(modelId, operation.entity.id).kind = "generalization";
    const child = operation.entity.child ? state.entityAnywhere(operation.entity.child)?.name : undefined;
    const parent = operation.entity.parent ? state.entityAnywhere(operation.entity.parent)?.name : undefined;
    if (child && parent) {
      return { category: "create", phrase: "create-generalization", params: { child, parent }, targetId: operation.entity.id };
    }
    return { category: "create", phrase: "create-generalization-plain", params: {}, targetId: operation.entity.id };
  }
  if (isModifyGeneralizationOperation(operation)) {
    return { category: "modify", phrase: "modify-generalization", params: {}, targetId: operation.entity.id, fields: changedFields(operation.entity) };
  }
  if (isDeleteEntityOperation(operation)) {
    const trace = state.entity(modelId, operation.entityId);
    const phrase = {
      "class": "delete-class",
      "relationship": "delete-relationship",
      "generalization": "delete-generalization",
      "class-profile": "delete-class-profile",
      "relationship-profile": "delete-relationship-profile",
    }[trace.kind ?? "class"] ?? "delete-entity";
    return {
      category: "delete",
      phrase: trace.kind ? phrase : "delete-entity",
      params: trace.name ? { name: trace.name } : {},
      targetId: operation.entityId,
    };
  }

  // Semantic model: application profiles.
  if (isCreateSemanticModelClassProfile(operation)) {
    const trace = state.entity(modelId, operation.entity.id);
    trace.kind = "class-profile";
    const name =
      (isLanguageString(operation.entity.name) ? operation.entity.name : undefined) ??
      state.entityAnywhere(operation.entity.profiling?.[0] ?? "")?.name;
    if (name) trace.name = name;
    return {
      category: "create",
      phrase: "create-class-profile",
      params: name ? { name } : {},
      targetId: operation.entity.profiling?.[0] ?? operation.entity.id,
    };
  }
  if (isModifySemanticModelClassProfile(operation)) {
    const trace = state.entity(modelId, operation.identifier);
    const name = (isLanguageString(operation.entity.name) ? operation.entity.name : undefined) ?? trace.name;
    if (isLanguageString(operation.entity.name)) trace.name = operation.entity.name;
    return {
      category: "modify",
      phrase: "modify-class-profile",
      params: name ? { name } : {},
      targetId: operation.identifier,
      fields: changedFields(operation.entity),
    };
  }
  if (isCreateSemanticModelRelationshipProfile(operation)) {
    const trace = state.entity(modelId, operation.entity.id);
    trace.kind = "relationship-profile";
    const profiled = operation.entity.ends?.flatMap((end) => end.profiling ?? [])[0];
    const name = nameFromPayload(operation.entity) ?? (profiled ? state.entityAnywhere(profiled)?.name : undefined);
    if (name) trace.name = name;
    return {
      category: "create",
      phrase: "create-relationship-profile",
      params: name ? { name } : {},
      targetId: profiled ?? operation.entity.id,
    };
  }
  if (isModifySemanticModelRelationshipProfile(operation)) {
    const trace = state.entity(modelId, operation.identifier);
    const name = nameFromPayload(operation.entity) ?? trace.name;
    if (name) trace.name = name;
    return {
      category: "modify",
      phrase: "modify-relationship-profile",
      params: name ? { name } : {},
      targetId: operation.identifier,
      fields: changedFields(operation.entity),
    };
  }
  if (isModifySemanticModelRelationshipEndProfile(operation)) {
    const trace = state.entity(modelId, operation.identifier);
    const name = (isLanguageString(operation.end.name) ? operation.end.name : undefined) ?? trace.name;
    if (isLanguageString(operation.end.name)) trace.name = operation.end.name;
    return {
      category: "modify",
      phrase: "modify-relationship-profile",
      params: name ? { name } : {},
      targetId: operation.identifier,
      fields: changedFields(operation.end),
    };
  }
  if (isAddControlledVocabularyAssignment(operation)) {
    const name = state.entityAnywhere(operation.classProfileIdentifier)?.name;
    return { category: "create", phrase: "assign-controlled-vocabulary", params: name ? { name } : {}, targetId: operation.classProfileIdentifier };
  }
  if (isRemoveControlledVocabularyAssignment(operation)) {
    const name = state.entityAnywhere(operation.classProfileIdentifier)?.name;
    return { category: "delete", phrase: "remove-controlled-vocabulary", params: name ? { name } : {}, targetId: operation.classProfileIdentifier };
  }
  if (isModifyControlledVocabularyAssignment(operation)) {
    const name = state.entityAnywhere(operation.classProfileIdentifier)?.name;
    return { category: "modify", phrase: "modify-controlled-vocabulary", params: name ? { name } : {}, targetId: operation.classProfileIdentifier };
  }

  // Visual model: the canvas.
  if (isAddVisualNodeOperation(operation)) {
    const trace = state.visual(modelId, operation.entity.id, "node");
    trace.representedId = operation.entity.representedEntity;
    trace.position = operation.entity.position;
    const name = state.entityAnywhere(operation.entity.representedEntity)?.name;
    return { category: "create", phrase: "add-visual-node", params: name ? { name } : {}, targetId: operation.entity.representedEntity };
  }
  if (isAddVisualDiagramNodeOperation(operation)) {
    const trace = state.visual(modelId, operation.entity.id, "diagram-node");
    trace.representedId = operation.entity.representedVisualModel;
    trace.position = operation.entity.position;
    return {
      category: "create",
      phrase: "add-visual-diagram-node",
      params: {},
      modelRef: operation.entity.representedVisualModel,
      targetId: operation.entity.representedVisualModel,
    };
  }
  if (isAddVisualRelationshipOperation(operation)) {
    const trace = state.visual(modelId, operation.entity.id, "relationship");
    trace.representedId = operation.entity.representedRelationship;
    const name = state.entityAnywhere(operation.entity.representedRelationship)?.name;
    return { category: "create", phrase: "add-visual-relationship", params: name ? { name } : {}, targetId: operation.entity.representedRelationship };
  }
  if (isAddVisualProfileRelationshipOperation(operation)) {
    state.visual(modelId, operation.entity.id, "profile-relationship");
    return { category: "create", phrase: "add-visual-profile-relationship", params: {}, targetId: operation.entity.id };
  }
  if (isAddVisualGroupOperation(operation)) {
    state.visual(modelId, operation.entity.id, "group");
    return { category: "create", phrase: "add-visual-group", params: {}, targetId: operation.entity.id };
  }
  if (isUpdateVisualEntityOperation(operation)) {
    const trace = state.visualIfKnown(modelId, operation.entityId);
    const params: OperationDescription["params"] = {};
    const name = trace?.representedId ? state.entityAnywhere(trace.representedId)?.name : undefined;
    if (name) params.name = name;
    const targetId = trace?.representedId ?? operation.entityId;
    const updates = operation.updates ?? {};

    if ("position" in updates && updates.position && typeof updates.position === "object") {
      const to = updates.position as Position;
      const from = trace?.position;
      if (trace) trace.position = to;
      if (from) {
        return { category: "move", phrase: "move-node", params: { ...params, from: formatPosition(from), to: formatPosition(to) }, targetId };
      }
      return { category: "move", phrase: "move-node-to", params: { ...params, to: formatPosition(to) }, targetId };
    }
    if ("waypoints" in updates) {
      return { category: "move", phrase: "reroute-edge", params, targetId };
    }
    if ("content" in updates) {
      return { category: "modify", phrase: "change-node-content", params, targetId };
    }
    return { category: "modify", phrase: "update-visual-entity", params, targetId, fields: changedFields(updates) };
  }
  if (isDeleteVisualEntityOperation(operation)) {
    const trace = state.visualIfKnown(modelId, operation.entityId);
    const name = trace?.representedId ? state.entityAnywhere(trace.representedId)?.name : undefined;
    const phrase =
      trace?.kind === "relationship" || trace?.kind === "profile-relationship"
        ? "remove-visual-relationship"
        : trace?.kind === "node" || trace?.kind === "diagram-node"
          ? "remove-visual-node"
          : "remove-visual-entity";
    return { category: "delete", phrase, params: name ? { name } : {}, targetId: trace?.representedId ?? operation.entityId };
  }
  if (isSetModelColorOperation(operation)) {
    if (operation.color === null) {
      return { category: "style", phrase: "remove-model-color", params: {}, modelRef: operation.modelId, targetId: operation.modelId };
    }
    return {
      category: "style",
      phrase: "set-model-color",
      params: {},
      modelRef: operation.modelId,
      targetId: operation.modelId,
      swatch: operation.color,
    };
  }
  if (isDeleteModelColorOperation(operation)) {
    return { category: "style", phrase: "remove-model-color", params: {}, modelRef: operation.modelId, targetId: operation.modelId };
  }
  if (isSetLabelOperation(operation)) {
    return { category: "modify", phrase: "rename-view", params: isLanguageString(operation.label) ? { name: operation.label } : {} };
  }
  if (isSetViewOperation(operation)) {
    return { category: "style", phrase: "set-view", params: {} };
  }

  // Imported vocabulary (RDFS) and queryable (SGOV) models.
  if (operation.type === ReloadModelOperationType) {
    return { category: "set", phrase: "reload-model", params: {} };
  }
  if (operation.type === SetModelUrlsOperationType) {
    return { category: "modify", phrase: "set-model-urls", params: {} };
  }
  if (operation.type === AddQueryOperationType) {
    return { category: "create", phrase: "add-query", params: {} };
  }
  if (operation.type === RemoveQueryOperationType) {
    return { category: "delete", phrase: "remove-query", params: {} };
  }

  // Structure model (PSM).
  if (typeof operation.type === "string" && operation.type.startsWith(PSM_OPERATION_PREFIX)) {
    return describePsmOperation(operation);
  }

  // Generic entity operations; how to phrase them depends on the model.
  if (isSetEntityOperation(operation) || isUpdateEntityOperation(operation) || isRemoveEntityOperation(operation)) {
    return describeGenericEntityOperation(modelId, operation, isProjectModel, modelType, state);
  }

  // Unknown operation: at least humanize its type.
  const type = typeof operation.type === "string" ? operation.type : "";
  const category: OperationCategory =
    type.includes("create") || type.includes("add")
      ? "create"
      : type.includes("delete") || type.includes("remove")
        ? "delete"
        : type.includes("modify") || type.includes("update") || type.includes("set")
          ? "modify"
          : "other";
  return { category, phrase: "generic", params: { text: type === "" ? "?" : humanizeTypeName(type) } };
}

// ---------------------------------------------------------------------------
// Generic entity operations (set / update / remove)
// ---------------------------------------------------------------------------

function describeGenericEntityOperation(
  modelId: string,
  operation: Operation,
  isProjectModel: boolean,
  modelType: string | undefined,
  state: ReplayState,
): OperationDescription {
  // The project model: entities are the models of the project.
  if (isProjectModel) {
    if (isRemoveEntityOperation(operation)) {
      return { category: "remove-model", phrase: "remove-model-entry", params: {}, modelRef: operation.entityId, targetId: operation.entityId };
    }
    const payload = isSetEntityOperation(operation) ? operation.entity : isUpdateEntityOperation(operation) ? operation.update : { id: "" };
    const label = (payload as { label?: unknown }).label;
    if (isLanguageString(label)) state.modelLabels.set(payload.id, label);
    return {
      category: "modify",
      phrase: "update-model",
      params: {},
      modelRef: payload.id,
      targetId: payload.id,
      fields: changedFields(payload),
    };
  }

  // Blob models: configuration and metadata stored as one JSON entity.
  if (modelId.endsWith("#svg")) {
    return { category: "set", phrase: "update-svg", params: {} };
  }
  if (modelType === V1.GENERATOR_CONFIGURATION) {
    return { category: "set", phrase: "update-generator-configuration", params: {} };
  }

  // A plain entity of any other model.
  if (isRemoveEntityOperation(operation)) {
    const trace = state.entity(modelId, operation.entityId);
    return { category: "delete", phrase: "remove-entity", params: trace.name ? { name: trace.name } : {}, targetId: operation.entityId };
  }
  const payload = isSetEntityOperation(operation) ? operation.entity : isUpdateEntityOperation(operation) ? operation.update : { id: "" };
  const trace = state.entity(modelId, payload.id);
  const name = nameFromPayload(payload as { name?: LanguageString }) ?? trace.name;
  if (name) trace.name = name;
  return {
    category: isSetEntityOperation(operation) ? "set" : "modify",
    phrase: isSetEntityOperation(operation) ? "set-entity" : "update-entity",
    params: name ? { name } : {},
    targetId: payload.id,
    fields: isUpdateEntityOperation(operation) ? changedFields(operation.update) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Structure model (PSM) operations
// ---------------------------------------------------------------------------

/** Translation keys under `history.psm-part.` for the entity kinds of the structure model. */
const PSM_PARTS: Record<string, string> = {
  "Class": "class",
  "Attribute": "attribute",
  "AssociationEnd": "association",
  "Or": "choice",
  "Container": "container",
  "Include": "include",
  "ClassReference": "class-reference",
  "ExternalRoot": "external-root",
};

function describePsmOperation(operation: Operation): OperationDescription {
  const suffix = operation.type.slice(PSM_OPERATION_PREFIX.length);
  const payload = operation as Operation & Record<string, unknown>;

  if (suffix === "CreateSchema") return { category: "create", phrase: "psm-create-schema", params: {} };
  if (suffix === "MoveProperty") return { category: "move", phrase: "psm-move-property", params: {} };
  if (suffix === "SetOrder") return { category: "move", phrase: "psm-set-order", params: {} };
  if (suffix === "SetHumanLabel") {
    const label = payload.dataPsmHumanLabel;
    return { category: "modify", phrase: "psm-set-human-label", params: isLanguageString(label) ? { name: label } : {} };
  }
  if (suffix === "SetTechnicalLabel") {
    const label = payload.dataPsmTechnicalLabel;
    return { category: "modify", phrase: "psm-set-technical-label", params: typeof label === "string" ? { value: label } : {} };
  }
  if (suffix === "ReplaceAlongInheritance") return { category: "modify", phrase: "psm-replace-along-inheritance", params: {} };
  if (suffix === "WrapWithOr") return { category: "modify", phrase: "psm-wrap-with-or", params: {} };
  if (suffix === "UnwrapOr") return { category: "modify", phrase: "psm-unwrap-or", params: {} };

  for (const [kind, partKey] of Object.entries(PSM_PARTS)) {
    if (suffix === `Create${kind}`) {
      return { category: "create", phrase: "psm-create", params: {}, paramKeys: { what: `history.psm-part.${partKey}` } };
    }
    if (suffix === `Delete${kind}`) {
      return { category: "delete", phrase: "psm-delete", params: {}, paramKeys: { what: `history.psm-part.${partKey}` } };
    }
  }
  if (suffix.startsWith("Set")) {
    return { category: "modify", phrase: "psm-set", params: { what: humanizeTypeName(suffix.slice("Set".length)).toLowerCase() } };
  }
  return { category: "other", phrase: "generic", params: { text: humanizeTypeName(suffix) } };
}

// ---------------------------------------------------------------------------
// Entry point: describe the whole history
// ---------------------------------------------------------------------------

/**
 * Describes every operation of a chronologically ordered history. Returns the
 * descriptions in a structure parallel to the input. `initialModelTypes` seeds
 * the model type knowledge from the current store; types of models created
 * (and possibly removed again) inside the history are picked up during the
 * replay itself.
 */
export function describeHistory(
  transactions: { operations: OperationInModel[] }[],
  initialModelTypes: Record<string, string>,
  projectModelId: string,
): OperationDescription[][] {
  const state = new ReplayState(initialModelTypes);
  const result: OperationDescription[][] = [];
  const modelRefDescriptions: OperationDescription[] = [];

  for (const transaction of transactions) {
    const described: OperationDescription[] = [];
    for (const { modelId, operation } of transaction.operations) {
      const description = describeOperation(modelId, operation, projectModelId, state);
      if (description.modelRef !== undefined) modelRefDescriptions.push(description);
      described.push(description);
    }
    result.push(described);
  }

  // Model names are usually set after the model is created, so they can only
  // be filled in once the whole history is replayed. Only used as a fallback
  // when the current store no longer knows the model (it was removed).
  for (const description of modelRefDescriptions) {
    const label = state.modelLabels.get(description.modelRef!.split("#")[0]!);
    if (label && description.params.name === undefined) description.params.name = label;
  }

  return result;
}
