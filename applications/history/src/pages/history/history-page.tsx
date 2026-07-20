import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useModelStore } from "@/contexts/model-store-context";
import { pickLanguageString, resolveEntityNameAnywhere, resolveModelDisplay } from "@/lib/model-display";
import { useLocation } from "@tanstack/react-router";
import { Boxes, Tag, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchProjectHistory,
  markHistoryVersion,
  undoHistoryTransaction,
  type DescribedOperationInModel,
  type HistoryEntry,
} from "./history-data";
import { CATEGORY_STYLE, humanizeTypeName } from "./operation-description";

/**
 * The history page: the full transaction history of the project's main
 * branch, newest first, grouped into work sessions (a new group starts after
 * half an hour without changes). Transactions group the operations executed
 * together; each transaction shows its operations per model — with the
 * model's icon and name — described in plain language, with the raw operation
 * data available in a tooltip. Operations on the project model are
 * highlighted, as they change the structure of the whole project. Any
 * transaction can be cancelled with an undo operation or marked with a
 * version (like a git tag) - both are recorded as new transactions.
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
    if (!backendUrl || !packageIri || !modelStore) return;
    setLoading(true);
    fetchProjectHistory(backendUrl, packageIri, modelStore)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [backendUrl, packageIri, modelStore]);

  useEffect(refresh, [refresh]);

  /** Newest first, split into sessions separated by half an hour of inactivity. */
  const sessions = useMemo(() => (entries === null ? [] : groupBySession([...entries].reverse())), [entries]);

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

      {sessions.length === 0 && <p className="text-sm text-muted-foreground">{t("history.empty")}</p>}

      {sessions.map((session) => (
        <div key={session[0]!.clientId} className="space-y-3">
          <SessionHeader session={session} language={i18n.language} />
          {session.map((entry) => (
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
      ))}
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

// ---------------------------------------------------------------------------
// Sessions: visual grouping by time
// ---------------------------------------------------------------------------

const SESSION_GAP_MS = 30 * 60 * 1000;

/** Splits a newest-first history into groups separated by 30+ minutes of inactivity. */
function groupBySession(entries: HistoryEntry[]): HistoryEntry[][] {
  const sessions: HistoryEntry[][] = [];
  for (const entry of entries) {
    const current = sessions[sessions.length - 1];
    const previous = current?.[current.length - 1];
    if (current && previous && previous.executedAt.getTime() - entry.executedAt.getTime() <= SESSION_GAP_MS) {
      current.push(entry);
    } else {
      sessions.push([entry]);
    }
  }
  return sessions;
}

/** "Jul 19, 2026 · 14:02 – 15:31" - the day and time span of the session. */
function SessionHeader({ session, language }: { session: HistoryEntry[]; language: string }) {
  const { t } = useTranslation();
  const newest = session[0]!.executedAt;
  const oldest = session[session.length - 1]!.executedAt;

  const day = new Intl.DateTimeFormat(language, { dateStyle: "medium" });
  const time = new Intl.DateTimeFormat(language, { timeStyle: "short" });
  const sameDay = day.format(newest) === day.format(oldest);
  const range = sameDay
    ? `${day.format(oldest)} · ${time.format(oldest)} – ${time.format(newest)}`
    : `${day.format(oldest)} ${time.format(oldest)} – ${day.format(newest)} ${time.format(newest)}`;

  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="shrink-0 text-sm font-medium">{range}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{t("history.session-changes", { count: session.length })}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

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
    const byModel = new Map<string, DescribedOperationInModel[]>();
    for (const operation of entry.operations) {
      byModel.set(operation.modelId, [...(byModel.get(operation.modelId) ?? []), operation]);
    }
    // The project model first, as its operations are the important ones.
    return [...byModel.entries()].sort(([a], [b]) => (a === modelStore?.projectModelId ? -1 : b === modelStore?.projectModelId ? 1 : 0));
  }, [entry, modelStore]);

  const time = new Intl.DateTimeFormat(language, { timeStyle: "medium" }).format(entry.executedAt);
  const fullTime = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "medium" }).format(entry.executedAt);

  return (
    <Card className={`p-4 ${touchesProjectModel ? "border-amber-400/60 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-950/20" : ""} ${entry.isUndone ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium tabular-nums">{time}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                <p>{fullTime}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{entry.clientId}</p>
              </TooltipContent>
            </Tooltip>
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
function ModelOperations({ modelId, operations, language, undone }: { modelId: string; operations: DescribedOperationInModel[]; language: string; undone: boolean }) {
  const { t } = useTranslation();
  const { modelStore } = useModelStore();

  const display = modelStore === null ? null : resolveModelDisplay(modelStore, modelId, language);
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
        {operations.map((item, index) => (
          <OperationRow key={item.operation.id ?? index} item={item} language={language} />
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * One operation as a plain-language sentence: an icon and a phrase built from
 * the operation description, with names resolved to the UI language. The raw
 * operation data (including all identifiers) is shown in a tooltip.
 */
function OperationRow({ item, language }: { item: DescribedOperationInModel; language: string }) {
  const { t } = useTranslation();
  const { modelStore } = useModelStore();
  const { operation, description } = item;
  const { icon: Icon, colorClass } = CATEGORY_STYLE[description.category];

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(description.params)) {
    params[key] = typeof value === "string" ? value : (pickLanguageString(value, language) ?? "");
  }
  for (const [key, translationKey] of Object.entries(description.paramKeys ?? {})) {
    params[key] = t(translationKey);
  }
  if (description.refTransactionId !== undefined) {
    params.time = item.refTime === undefined ? "?" : new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(item.refTime);
  }
  if (params.name === undefined) {
    params.name = resolveFallbackName(description, modelStore, language, t) ?? t("history.unnamed");
  }

  const fields = description.fields
    ?.map((field) => t(`history.field.${field}`, { defaultValue: humanizeTypeName(field).toLowerCase() }))
    .join(", ");

  return (
    <Tooltip delayDuration={700}>
      <TooltipTrigger asChild>
        <li className="flex items-center gap-2 text-sm">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} />
          <span className="truncate">{t(`history.op.${description.phrase}`, params)}</span>
          {description.swatch && <span className="h-3 w-3 shrink-0 rounded-sm border border-border" style={{ backgroundColor: description.swatch }} />}
          {fields && <span className="truncate text-xs text-muted-foreground">({fields})</span>}
        </li>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-lg p-0">
        <div className="max-h-72 overflow-auto p-3">
          <p className="mb-1 font-mono text-[10px] text-muted-foreground">{typeof operation.type === "string" ? operation.type : ""}</p>
          <pre className="whitespace-pre-wrap break-all font-mono text-[10px] leading-snug">{formatOperationData(operation)}</pre>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Name of the operation's subject when the history itself does not know it:
 * a model referenced by the operation, or an entity looked up in the current
 * store (it may no longer exist).
 */
function resolveFallbackName(
  description: DescribedOperationInModel["description"],
  modelStore: ReturnType<typeof useModelStore>["modelStore"],
  language: string,
  t: (key: string) => string,
): string | null {
  if (modelStore === null) return null;
  if (description.modelRef !== undefined) {
    const display = resolveModelDisplay(modelStore, description.modelRef, language);
    return display.name ?? t(`model-type.${display.typeKey}`);
  }
  if (description.targetId !== undefined) {
    return resolveEntityNameAnywhere(modelStore, description.targetId, language);
  }
  return null;
}

const OPERATION_DATA_LIMIT = 3000;

function formatOperationData(operation: object): string {
  const json = JSON.stringify(operation, null, 2);
  return json.length > OPERATION_DATA_LIMIT ? `${json.slice(0, OPERATION_DATA_LIMIT)}…` : json;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

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
