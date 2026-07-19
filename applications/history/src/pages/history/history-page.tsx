import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useModelStore } from "@/contexts/model-store-context";
import { useLocation } from "@tanstack/react-router";
import { isUndoOperation, isVersionOperation, type Operation, type OperationInModel } from "@dataspecer/core/operation";
import { Boxes, Tag, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { modelDisplayName } from "../evolution/evolution-data";
import {
  fetchProjectHistory,
  markHistoryVersion,
  resolveEntityName,
  undoHistoryTransaction,
  type HistoryEntry,
} from "./history-data";
import { getOperationDisplay } from "./operation-display";

/**
 * The history page: the full transaction history of the project's main
 * branch, newest first. Transactions group the operations executed together;
 * each shows its execution time, its operations with icons and colors
 * (operations on the project model are highlighted, as they change the
 * structure of the whole project), the versions marking it (like git tags)
 * and whether it was undone. Any transaction can be cancelled with an undo
 * operation or marked with a version - both are recorded as new transactions
 * of the history.
 */
export function HistoryPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const packageIri = (location.search as Record<string, unknown>).packageIri as string | undefined;
  const { modelStore } = useModelStore();
  const backendUrl = import.meta.env.VITE_BACKEND as string | undefined;

  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  /** Client id of the transaction whose action is currently running. */
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!backendUrl || !packageIri) return;
    setLoading(true);
    fetchProjectHistory(backendUrl, packageIri)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [backendUrl, packageIri]);

  useEffect(refresh, [refresh]);

  /** Newest first for display. */
  const orderedEntries = useMemo(() => (entries === null ? [] : [...entries].reverse()), [entries]);

  const handleUndo = async (entry: HistoryEntry) => {
    if (!backendUrl || !packageIri) return;
    setBusyId(entry.clientId);
    try {
      await undoHistoryTransaction(backendUrl, packageIri, entry);
      refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkVersion = async (entry: HistoryEntry, version: string) => {
    if (!backendUrl || !packageIri || !modelStore) return;
    setBusyId(entry.clientId);
    try {
      await markHistoryVersion(backendUrl, packageIri, modelStore.projectModelId, entry.clientId, version);
      refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setBusyId(null);
    }
  };

  if (!packageIri) {
    return (
      <div className="space-y-4">
        <PageHeader />
        <p className="text-sm text-muted-foreground">{t("history.no-project")}</p>
      </div>
    );
  }

  if (loading || entries === null || !modelStore) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {orderedEntries.length === 0 && <p className="text-sm text-muted-foreground">{t("history.empty")}</p>}

      <div className="space-y-3">
        {orderedEntries.map((entry) => (
          <TransactionCard
            key={entry.clientId}
            entry={entry}
            busy={busyId !== null}
            language={i18n.language}
            onUndo={() => handleUndo(entry)}
            onMarkVersion={(version) => handleMarkVersion(entry, version)}
          />
        ))}
      </div>
    </div>
  );
}

function PageHeader() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("history.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("history.description")}</p>
    </div>
  );
}

function TransactionCard({
  entry,
  busy,
  language,
  onUndo,
  onMarkVersion,
}: {
  entry: HistoryEntry;
  busy: boolean;
  language: string;
  onUndo: () => void;
  onMarkVersion: (version: string) => void;
}) {
  const { t } = useTranslation();
  const { modelStore } = useModelStore();

  const touchesProjectModel = modelStore !== null && entry.operations.some(({ modelId }) => modelId === modelStore.projectModelId);

  const operationsByModel = useMemo(() => {
    const byModel = new Map<string, OperationInModel[]>();
    for (const operation of entry.operations) {
      byModel.set(operation.modelId, [...(byModel.get(operation.modelId) ?? []), operation]);
    }
    // The project model first, as its operations are the important ones.
    return [...byModel.entries()].sort(([a], [b]) => (a === modelStore?.projectModelId ? -1 : b === modelStore?.projectModelId ? 1 : 0));
  }, [entry, modelStore]);

  const time = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "medium" }).format(entry.executedAt);

  return (
    <Card className={`p-4 ${touchesProjectModel ? "border-amber-400/60 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-950/20" : ""} ${entry.isUndone ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium tabular-nums">{time}</span>
            <span className="font-mono text-xs text-muted-foreground" title={entry.clientId}>
              {entry.clientId.slice(0, 8)}
            </span>
            {entry.versions.map((version) => (
              <Badge key={version} className="gap-1 border-transparent bg-purple-600 text-white hover:bg-purple-600 dark:bg-purple-500">
                <Tag className="h-3 w-3" />
                {version}
              </Badge>
            ))}
            {touchesProjectModel && (
              <Badge variant="outline" className="gap-1 border-amber-500/60 text-amber-700 dark:text-amber-400">
                <Boxes className="h-3 w-3" />
                {t("history.badge.project-structure")}
              </Badge>
            )}
            {entry.isUndone && <Badge variant="secondary">{t("history.badge.undone")}</Badge>}
          </div>

          <div className="space-y-2">
            {operationsByModel.map(([modelId, operations]) => (
              <ModelOperations key={modelId} modelId={modelId} operations={operations} language={language} undone={entry.undoneInModels.has(modelId)} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <MarkVersionButton disabled={busy} onMarkVersion={onMarkVersion} />
          <Button variant="outline" size="sm" disabled={busy || entry.isUndone} onClick={onUndo} title={t("history.action.undo-description")}>
            <Undo2 className="mr-1 h-4 w-4" />
            {t("history.action.undo")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** The operations of one transaction targeting one model. */
function ModelOperations({ modelId, operations, language, undone }: { modelId: string; operations: OperationInModel[]; language: string; undone: boolean }) {
  const { t } = useTranslation();
  const { modelStore } = useModelStore();

  const isProjectModel = modelStore !== null && modelId === modelStore.projectModelId;
  const modelName = modelStore === null ? modelId : isProjectModel ? t("history.project-model") : modelDisplayName(modelStore, modelId.split("#")[0]!, language);

  return (
    <div className={undone ? "line-through decoration-muted-foreground/60" : ""}>
      <div className="mb-1 flex items-center gap-2">
        <Badge variant={isProjectModel ? "default" : "secondary"} className={`font-normal ${isProjectModel ? "bg-amber-600 text-white hover:bg-amber-600 dark:bg-amber-500" : ""}`}>
          {modelName}
        </Badge>
        {undone && <span className="text-xs text-muted-foreground no-underline">{t("history.badge.undone-in-model")}</span>}
      </div>
      <ul className="space-y-0.5">
        {operations.map(({ operation }, index) => (
          <OperationRow key={operation.id ?? index} modelId={modelId} operation={operation} language={language} />
        ))}
      </ul>
    </div>
  );
}

function OperationRow({ modelId, operation, language }: { modelId: string; operation: Operation; language: string }) {
  const { t } = useTranslation();
  const { modelStore } = useModelStore();
  const display = getOperationDisplay(operation);
  const Icon = display.icon;

  let target: string | null = null;
  if (isVersionOperation(operation)) {
    target = t("history.version-target", { version: operation.version, id: operation.versionedTransactionId.slice(0, 8) });
  } else if (isUndoOperation(operation)) {
    target = t("history.undo-target", { id: operation.cancelTransactionId.slice(0, 8) });
  } else if (display.targetEntityId !== null) {
    const name = modelStore === null ? null : resolveEntityName(modelStore, modelId, display.targetEntityId, language);
    target = name ?? display.targetEntityId;
  }

  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${display.colorClass}`} />
      <span className={`shrink-0 font-medium ${display.colorClass}`}>{t(`history.category.${display.category}`)}</span>
      {target !== null && <span className="truncate" title={display.targetEntityId ?? undefined}>{target}</span>}
      <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">{typeof operation.type === "string" ? operation.type.split("/").pop() : ""}</span>
    </li>
  );
}

/** Popover with a version label input, like tagging a commit in git. */
function MarkVersionButton({ disabled, onMarkVersion }: { disabled: boolean; onMarkVersion: (version: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("");

  const confirm = () => {
    const value = version.trim();
    if (value.length === 0) return;
    setOpen(false);
    setVersion("");
    onMarkVersion(value);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Tag className="mr-1 h-4 w-4" />
          {t("history.action.tag")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2">
        <p className="text-sm font-medium">{t("history.action.tag-title")}</p>
        <input
          autoFocus
          value={version}
          onChange={(event) => setVersion(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && confirm()}
          placeholder={t("history.action.tag-placeholder")}
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="sm" className="w-full" disabled={version.trim().length === 0} onClick={confirm}>
          {t("history.action.tag-confirm")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
