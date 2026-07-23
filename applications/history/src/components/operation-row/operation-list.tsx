import { OperationRow, type OperationRowProps } from "@/components/operation-row/operation-row";
import { Badge } from "@/components/ui/badge";
import { useModelStore } from "@/contexts/model-store-context";
import { resolveModelDisplay } from "@/lib/model-display";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * Renders a flat list of operations grouped by the model they target.
 */
export function OperationGroups({ operations, undoneInModels }: { operations: OperationRowProps[]; undoneInModels?: Set<string> }) {
  const { modelStore } = useModelStore();

  const groups = useMemo(() => {
    const byModel = new Map<string, OperationRowProps[]>();
    for (const entry of operations) {
      byModel.set(entry.modelId, [...(byModel.get(entry.modelId) ?? []), entry]);
    }
    // The project model first, as its operations are the important ones.
    return [...byModel.entries()].sort(([a], [b]) => (a === modelStore?.projectModelId ? -1 : b === modelStore?.projectModelId ? 1 : 0));
  }, [operations, modelStore]);

  return (
    <div className="space-y-2">
      {groups.map(([modelId, modelOperations]) => (
        <SingleModelOperations key={modelId} modelId={modelId} operations={modelOperations} undone={undoneInModels?.has(modelId) ?? false} />
      ))}
    </div>
  );
}

function SingleModelOperations({ modelId, operations, undone }: { modelId: string; operations: OperationRowProps[]; undone: boolean }) {
  const { t, i18n } = useTranslation();
  const { modelStore } = useModelStore();

  const display = modelStore === null ? null : resolveModelDisplay(modelStore, modelId, i18n.language);
  const ModelIcon = display?.icon;
  const typeName = display === null ? null : t(`model-type.${display.typeKey}`);
  const modelName = display === null ? null : display.isProjectModel ? t("history.project-model") : (display.name ?? typeName);

  return (
    <div className={undone ? "line-through decoration-muted-foreground/60" : ""}>
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
