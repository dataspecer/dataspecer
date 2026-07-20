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
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
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
  [LOCAL_PACKAGE]: { typeKey: "package", icon: Package },
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
