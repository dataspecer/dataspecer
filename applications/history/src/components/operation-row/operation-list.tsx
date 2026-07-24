import { OperationRow, type OperationRowProps } from "@/components/operation-row/operation-row";
import { Badge } from "@/components/ui/badge";
import { useModelStore } from "@/contexts/model-store-context";
import { modelTypesFromProjectModel, resolveModelDisplay } from "@/lib/model-display";
import { applyOperationsToModels } from "@/lib/model-snapshots";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import type { OperationInModel } from "@dataspecer/core/operation";
import { build } from "@dataspecer/specification/model-hierarchy";
import { isPackageEntity } from "@dataspecer/project-model";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/** Fixed id of the virtual project model, shared by every model store instance. */
const PROJECT_MODEL_ID: ModelIdentifier = "_project_model";

/**
 * For a given package (modelId) it builds aggregated entities and returns them.
 *
 * Uses caching.
 */
export function getAggregatedEntitiesWithPassthroughForPackage(models: Record<ModelIdentifier, EntityRecord>, modelId: ModelIdentifier, cache: Map<ModelIdentifier, EntityRecord>): EntityRecord {
  if (modelId === PROJECT_MODEL_ID) return {};

  let owningPackageId: ModelIdentifier | null = null;
  for (const entity of Object.values(models[PROJECT_MODEL_ID] ?? {})) {
    if (isPackageEntity(entity) && entity.subModels.includes(modelId)) {
      owningPackageId = entity.id;
      break;
    }
  }

  if (!owningPackageId) {
    return {}; // No entities
  }

  const cached = cache.get(owningPackageId);
  if (cached) return cached;

  let context: EntityRecord = {};
  try {
    const aggregator = build(owningPackageId, models, undefined, undefined, true);
    for (const wrapped of Object.values(aggregator.getAggregatedEntities())) {
      context[wrapped.aggregatedEntity.id] = wrapped.aggregatedEntity;
    }
  } catch (error) {
    console.warn(`Failed to aggregate package "${owningPackageId}" for display, using an empty context.`, error);
    context = {};
  }
  cache.set(owningPackageId, context);
  return context;
}

/**
 * Renders a flat list of operations grouped by the model they target.
 *
 * Takes the full models of the project as they were just before the given
 * operations, and derives everything else itself: the models just after the
 * operations, and, for every non-project model, the aggregated state of the
 * package it belongs to (before and after) used to name entities that only
 * profiles resolve. This makes the component self-contained — the operations
 * it renders do not need to relate to the current state of the model store.
 */
export function OperationGroups({
  modelsBefore,
  operations,
  undoneInModels,
  importantModelTypes,
}: {
  modelsBefore: Record<ModelIdentifier, EntityRecord>;
  operations: OperationInModel[];
  undoneInModels?: Set<string>;
  /* When used, non important models become grayed. */
  importantModelTypes?: string[];
}) {
  const rows = useMemo((): OperationRowProps[] => {
    const modelsAfter: Record<ModelIdentifier, EntityRecord> = { ...modelsBefore };
    for (const modelId of new Set(operations.map(({ modelId }) => modelId))) {
      modelsAfter[modelId] = { ...(modelsAfter[modelId] ?? {}) };
    }
    applyOperationsToModels(modelsAfter, operations);

    const contextBeforeCache = new Map<ModelIdentifier, EntityRecord>();
    const contextAfterCache = new Map<ModelIdentifier, EntityRecord>();

    return operations.map(
      ({ modelId, operation }): OperationRowProps => ({
        modelId,
        operation,
        before: modelsBefore[modelId] ?? {},
        after: modelsAfter[modelId] ?? {},
        contextBefore: getAggregatedEntitiesWithPassthroughForPackage(modelsBefore, modelId, contextBeforeCache),
        contextAfter: getAggregatedEntitiesWithPassthroughForPackage(modelsAfter, modelId, contextAfterCache),
      }),
    );
  }, [modelsBefore, operations]);

  const groups = useMemo(() => {
    const byModel = new Map<string, OperationRowProps[]>();
    for (const entry of rows) {
      byModel.set(entry.modelId, [...(byModel.get(entry.modelId) ?? []), entry]);
    }
    const modelTypes = modelTypesFromProjectModel(modelsBefore[PROJECT_MODEL_ID] ?? {});
    const rank = (modelId: string): number => {
      if (!importantModelTypes) {
        if (modelId === PROJECT_MODEL_ID) {
          return 0;
        }
        return 1;
      } else {
        if (modelId === PROJECT_MODEL_ID) {
          if (importantModelTypes.includes(PROJECT_MODEL_ID)) {
            return 0;
          } else {
            return 2;
          }
        }
        return importantModelTypes.includes(modelTypes[modelId] ?? "") ? 1 : 3;
      }
    };
    return [...byModel.entries()]
      .sort(([a], [b]) => rank(a) - rank(b))
      .map(([modelId, modelOperations]): [string, OperationRowProps[], boolean] => [modelId, modelOperations, rank(modelId) >= 2]);
  }, [rows, modelsBefore, importantModelTypes]);

  console.log(groups);

  return (
    <div className="space-y-2">
      {groups.map(([modelId, modelOperations, unimportant]) => (
        <SingleModelOperations
          key={modelId}
          modelId={modelId}
          operations={modelOperations}
          undone={undoneInModels?.has(modelId) ?? false}
          unimportant={unimportant}
        />
      ))}
    </div>
  );
}

function SingleModelOperations({
  modelId,
  operations,
  undone,
  unimportant,
}: {
  modelId: string;
  operations: OperationRowProps[];
  undone: boolean;
  unimportant?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { modelStore } = useModelStore();

  const display = modelStore === null ? null : resolveModelDisplay(modelStore, modelId, i18n.language);
  const ModelIcon = display?.icon;
  const typeName = display === null ? null : t(`model-type.${display.typeKey}`);
  const modelName = display === null ? null : display.isProjectModel ? t("history.project-model") : (display.name ?? typeName);

  return (
    <div className={[undone && "line-through decoration-muted-foreground/60", unimportant && "opacity-50"].filter(Boolean).join(" ")}>
      <div className="mb-1 flex items-center gap-2">
        <Badge
          variant={display?.isProjectModel ? "default" : "secondary"}
          className={`gap-1 font-normal ${display?.isProjectModel ? "bg-amber-600 text-white hover:bg-amber-600 dark:bg-amber-500" : ""}`}
        >
          {ModelIcon && <ModelIcon className="h-3 w-3" />}
          {modelName}
        </Badge>
        {display !== null && !display.isProjectModel && display.name !== null && <span className="text-xs text-muted-foreground">{typeName}</span>}
        {undone && <span className="text-xs text-muted-foreground no-underline">{t("history.badge.undone-in-model")}</span>}
      </div>
      <ul className="space-y-0.5">
        {operations.map((entry, index) => (
          <OperationRow key={entry.operation.id ?? index} {...entry} />
        ))}
      </ul>
    </div>
  );
}
