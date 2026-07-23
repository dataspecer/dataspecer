import {
  API_SPECIFICATION_MODEL,
  APPLICATION_GRAPH,
  LOCAL_PACKAGE,
  LOCAL_SEMANTIC_MODEL,
  QUERYABLE_MODEL,
  RDFS_MODEL,
  V1,
  VISUAL_MODEL,
} from "@dataspecer/core-v2/model/known-models";
import { isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import type { DefaultFrontendModelStore } from "@dataspecer/model-store/implementation";
import type { ProjectModelEntity } from "@dataspecer/project-model";
import {
  BookOpen,
  Box,
  Boxes,
  Braces,
  CloudDownload,
  Globe,
  Layers,
  ListTree,
  Network,
  Package,
  Settings2,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/**
 * The single place that knows how to present a model to the user: its icon,
 * the human name of its type (as a translation key under `model-type.`) and
 * its display name. Used by both the evolution pages and the history page.
 */

/**
 * A resolved entity label: its human-readable name, and its iri — kept apart
 * (rather than merged into one string) so the UI can render them differently
 * (e.g. the name in bold and the iri in gray, see the `EntityName` component
 * in `operation-row.tsx`). Both are null when nothing is known about the
 * entity at all (a dangling reference by an id not found anywhere).
 */
export interface EntityLabel {
  name: string | null;
  iri: string | null;
}

/**
 * Resolves the label of a class, relationship, profile or generalization
 * entity within the given entity record (a generalization is named after its
 * child and parent, resolved the same way via {@link entityLabelById}). Both
 * `name` and `iri` are null when the entity itself is missing (e.g. a dangling
 * reference) — use {@link entityLabelById} instead when the entity may not
 * exist, so a class the store never received (or already lost) is still
 * identified by its id (which, for such a reference, doubles as its iri)
 * rather than shown as nothing.
 */
export function entityLabel(entity: Entity | null | undefined, entities: EntityRecord, language: string): EntityLabel {
  if (!entity) return { name: null, iri: null };
  if (isSemanticModelClass(entity) || isSemanticModelClassProfile(entity)) {
    return { name: pickLanguageString(entity.name, language), iri: entity.iri };
  }
  if (isSemanticModelRelationship(entity)) {
    const rangeEnd = entity.ends.find((end) => end.iri !== null) ?? entity.ends[1];
    return {
      name: pickLanguageString(rangeEnd?.name, language) ?? pickLanguageString(entity.name, language),
      iri: rangeEnd?.iri ?? null,
    };
  }
  if (isSemanticModelRelationshipProfile(entity)) {
    // A relationship profile holds its data on the range end by convention.
    const rangeEnd = entity.ends[1] ?? entity.ends[0];
    return { name: pickLanguageString(rangeEnd?.name, language), iri: rangeEnd?.iri ?? null };
  }
  if (isSemanticModelGeneralization(entity)) {
    const child = entityLabelText(entityLabelById(entity.child, entities, language));
    const parent = entityLabelText(entityLabelById(entity.parent, entities, language));
    return { name: `${child} → ${parent}`, iri: entity.iri };
  }
  // An entity of an unknown type has no name; its id identifies it.
  return { name: null, iri: entity.id };
}

/**
 * Same as {@link entityLabel}, but looks the entity up by id first — when a
 * referenced class does not exist at all (e.g. it was never loaded, or has
 * since been deleted), its id is resolved as its `iri` (with no `name`)
 * instead of both being null, since for such a dangling reference the id is
 * (or stands in for) its iri.
 */
export function entityLabelById(id: string, entities: EntityRecord, language: string): EntityLabel {
  const entity = entities[id];
  return entity ? entityLabel(entity, entities, language) : { name: null, iri: id };
}

/** Flattens a resolved label into a single string, for plain-text (non-JSX) use. */
export function entityLabelText(label: EntityLabel): string {
  return label.name ?? label.iri ?? "?";
}

/** Resolves a language string to the UI language with sensible fallbacks. */
export function pickLanguageString(value: unknown, language: string): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, string>;
  return record[language] ?? record["en"] ?? Object.values(record)[0] ?? null;
}

export interface ModelTypeDisplay {
  /** Translation key under `model-type.`. */
  typeKey: string;
  icon: LucideIcon;
}

const MODEL_TYPE_DISPLAY: Record<string, ModelTypeDisplay> = {
  [LOCAL_PACKAGE]: { typeKey: "specification", icon: Package },
  [LOCAL_SEMANTIC_MODEL]: { typeKey: "vocabulary", icon: BookOpen },
  [VISUAL_MODEL]: { typeKey: "visual-model", icon: Workflow },
  [RDFS_MODEL]: { typeKey: "imported-vocabulary", icon: CloudDownload },
  [QUERYABLE_MODEL]: { typeKey: "queryable-vocabulary", icon: Globe },
  [API_SPECIFICATION_MODEL]: { typeKey: "api-specification", icon: Braces },
  [APPLICATION_GRAPH]: { typeKey: "application-graph", icon: Network },
  [V1.PSM]: { typeKey: "structure-model", icon: ListTree },
  [V1.GENERATOR_CONFIGURATION]: { typeKey: "generator-configuration", icon: Settings2 },
};

const PROJECT_DISPLAY: ModelTypeDisplay = { typeKey: "project", icon: Boxes };
const PROFILE_DISPLAY: ModelTypeDisplay = { typeKey: "profile", icon: Layers };
const UNKNOWN_DISPLAY: ModelTypeDisplay = { typeKey: "model", icon: Box };

/** Icon and type name of a model type; a generic fallback for unknown types. */
export function modelTypeDisplay(modelType: string | null | undefined): ModelTypeDisplay {
  return (modelType && MODEL_TYPE_DISPLAY[modelType]) || UNKNOWN_DISPLAY;
}

export interface ModelDisplay extends ModelTypeDisplay {
  /** Human-readable name of the model, or null when it has no label. */
  name: string | null;
  isProjectModel: boolean;
}

/**
 * Resolves everything needed to present a model: its name from the project
 * model entity, and the icon and type name of its type. A semantic model
 * containing profile entities is presented as an application profile. Blob
 * model ids of the form `resourceId#blobName` are resolved to their resource.
 */
export function resolveModelDisplay(modelStore: DefaultFrontendModelStore, modelId: string, language: string): ModelDisplay {
  const baseId = modelId.split("#")[0]!;
  if (baseId === modelStore.projectModelId) {
    return { name: null, isProjectModel: true, ...PROJECT_DISPLAY };
  }

  const allEntities = modelStore.getAllEntities();
  const entity = allEntities[modelStore.projectModelId]?.[baseId] as ProjectModelEntity | undefined;

  let display = modelTypeDisplay(entity?.modelType);
  if (entity?.modelType === LOCAL_SEMANTIC_MODEL) {
    const entities = Object.values(allEntities[baseId] ?? {});
    if (entities.some((e) => isSemanticModelClassProfile(e) || isSemanticModelRelationshipProfile(e))) {
      display = PROFILE_DISPLAY;
    }
  }

  return { name: pickLanguageString(entity?.label, language), isProjectModel: false, ...display };
}

/** Model types of all models of the project, keyed by model id. */
export function modelTypesFromStore(modelStore: DefaultFrontendModelStore): Record<string, string> {
  const projectEntities = modelStore.getAllEntities()[modelStore.projectModelId] ?? {};
  const result: Record<string, string> = {};
  for (const entity of Object.values(projectEntities)) {
    const projectEntity = entity as ProjectModelEntity;
    if (projectEntity.modelType) result[projectEntity.id] = projectEntity.modelType;
  }
  return result;
}

/**
 * Best-effort human-readable name of an entity searched across all models of
 * the store — used as fallback when the history itself does not know the name.
 */
export function resolveEntityNameAnywhere(modelStore: DefaultFrontendModelStore, entityId: string, language: string): string | null {
  const allEntities = modelStore.getAllEntities();
  for (const entities of Object.values(allEntities)) {
    const entity = entities[entityId] as { name?: unknown; label?: unknown; ends?: { name?: Record<string, string> }[] } | undefined;
    if (!entity) continue;
    const name =
      pickLanguageString(entity.name, language) ??
      pickLanguageString(entity.label, language) ??
      pickLanguageString(entity.ends?.find((end) => end.name && Object.keys(end.name).length > 0)?.name, language);
    if (name !== null) return name;
  }
  return null;
}

/**
 * Label of an entity referenced by another operation (e.g. the domain/range
 * of a relationship, or the parent/child of a generalization) that the
 * operation itself does not carry a name for: its name if found anywhere in
 * the store, else its IRI, else the raw id.
 */
export function resolveEntityLabelAnywhere(modelStore: DefaultFrontendModelStore, entityId: string, language: string): string {
  const name = resolveEntityNameAnywhere(modelStore, entityId, language);
  if (name !== null) return name;
  const allEntities = modelStore.getAllEntities();
  for (const entities of Object.values(allEntities)) {
    const entity = entities[entityId] as { iri?: string | null } | undefined;
    if (entity?.iri) return entity.iri;
  }
  return entityId;
}
