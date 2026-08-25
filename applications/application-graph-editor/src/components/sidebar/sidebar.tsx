import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { clamp } from "es-toolkit";
import { AlertTriangle, ChevronsLeft, X, XCircle } from "lucide-react";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { useEditorStore, type SidebarTab } from "../../store.ts";
import { useValidation, useViolationsBySeverity } from "../../hooks/use-validation.ts";
import { bySeverity, violationsFor, type ValidationSnapshot } from "../../validation/violations.ts";
import { EdgeForm } from "./edge-form.tsx";
import { JsonPanel } from "./json-panel.tsx";
import { NodeIdReset } from "./node-id-reset.tsx";
import { NodeForm } from "./node-form.tsx";
import { ProblemsPanel } from "./problems-panel.tsx";
import { SettingsForm } from "./settings-form.tsx";

const MIN_WIDTH = 280;

function defaultWidth(): number {
  return clamp(Math.round(window.innerWidth * 0.22), 320, 720);
}

function maximumWidth(): number {
  return Math.max(MIN_WIDTH, Math.round(window.innerWidth / 2));
}

/**
 * The resizable and collapsible right side panel.
 */
export function Sidebar({ graph }: { graph: ApplicationGraph }) {
  const selection = useEditorStore((state) => state.selection);
  const settingsOpen = useEditorStore((state) => state.settingsOpen);
  const sidebarTab = useEditorStore((state) => state.sidebarTab);
  const [width, setWidth] = useState(defaultWidth);

  const lastTab = useRef<Exclude<SidebarTab, null>>("json");
  useEffect(() => {
    if (sidebarTab) {
      lastTab.current = sidebarTab;
    }
  }, [sidebarTab]);

  const validation = useValidation();
  const { errors, warnings } = useViolationsBySeverity();

  const node =
    selection?.kind === "node"
      ? graph.nodes.find((candidate) => candidate.id === selection.id)
      : undefined;
  const edge =
    selection?.kind === "edge"
      ? graph.edges.find((candidate) => candidate.id === selection.id)
      : undefined;

  let header: ReactNode;
  let content: ReactNode;
  if (node) {
    header = (
      <PanelTitle
        title="Node"
        subtitle={node.id}
        level={violationLevel(validation, "node", node.id)}
        action={<NodeIdReset node={node} />}
        onClose={() => useEditorStore.getState().requestSelect(null)}
      />
    );
    content = <FormScroll>{<NodeForm node={node} />}</FormScroll>;
  } else if (edge) {
    header = (
      <PanelTitle
        title="Edge"
        subtitle={edge.id}
        level={violationLevel(validation, "edge", edge.id)}
        onClose={() => useEditorStore.getState().requestSelect(null)}
      />
    );
    content = <FormScroll>{<EdgeForm edge={edge} />}</FormScroll>;
  } else if (settingsOpen) {
    header = (
      <PanelTitle
        title="Graph settings"
        onClose={() => useEditorStore.getState().setSettingsOpen(false)}
      />
    );
    content = <FormScroll>{<SettingsForm graph={graph} />}</FormScroll>;
  } else if (sidebarTab) {
    header = (
      <div className="flex items-center gap-1 border-b border-slate-200 px-2 py-1.5">
        <Tab tab="problems" active={sidebarTab}>
          Problems
          {errors.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-red-600">
              <XCircle size={12} />
              {errors.length}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-600">
              <AlertTriangle size={12} />
              {warnings.length}
            </span>
          )}
        </Tab>
        <Tab tab="json" active={sidebarTab}>
          JSON
        </Tab>
        <div className="grow" />
        <CloseButton label="Collapse sidebar" onClick={() => useEditorStore.getState().setSidebarTab(null)} />
      </div>
    );
    content = sidebarTab === "problems" ? <ProblemsPanel graph={graph} /> : <JsonPanel graph={graph} />;
  } else {
    return (
      <ExpandButton onOpen={() => useEditorStore.getState().setSidebarTab(lastTab.current)} />
    );
  }

  return (
    <aside
      style={{ width }}
      className="relative flex shrink-0 flex-col border-l border-slate-200 bg-white"
    >
      <ResizeHandle width={width} onWidthChange={setWidth} />
      {header}
      {content}
    </aside>
  );
}

function ResizeHandle({
  width,
  onWidthChange,
}: {
  width: number;
  onWidthChange: (width: number) => void;
}) {
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const onMove = (move: globalThis.PointerEvent) => {
      onWidthChange(clamp(startWidth + (startX - move.clientX), MIN_WIDTH, maximumWidth()));
    };
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      className="absolute inset-y-0 left-0 z-10 w-1 cursor-col-resize hover:bg-slate-300"
      onPointerDown={onPointerDown}
    />
  );
}

function ExpandButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="absolute right-2 top-2 z-10 cursor-pointer rounded border border-slate-300 bg-white p-1 text-slate-500 shadow-sm hover:bg-slate-100"
      onClick={onOpen}
      aria-label="Open sidebar"
      title="Open sidebar"
    >
      <ChevronsLeft size={16} />
    </button>
  );
}

function Tab({
  tab,
  active,
  children,
}: {
  tab: Exclude<SidebarTab, null>;
  active: SidebarTab;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-sm ${
        active === tab
          ? "bg-slate-200 font-medium text-slate-800"
          : "text-slate-500 hover:bg-slate-100"
      }`}
      onClick={() => useEditorStore.getState().setSidebarTab(tab)}
    >
      {children}
    </button>
  );
}

/** The worse level among the element's violations, null when it has none. */
function violationLevel(
  validation: ValidationSnapshot | null,
  kind: "node" | "edge",
  id: string,
): "error" | "warning" | null {
  if (validation === null) {
    return null;
  }
  const { errors, warnings } = bySeverity(
    violationsFor(validation.graph, validation.violations, kind, id),
  );
  if (errors.length > 0) {
    return "error";
  }
  return warnings.length > 0 ? "warning" : null;
}

function PanelTitle({
  title,
  subtitle,
  level,
  action,
  onClose,
}: {
  title: string;
  subtitle?: string;
  level?: "error" | "warning" | null;
  action?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
      <span className="shrink-0 text-sm font-semibold text-slate-700">{title}</span>
      {subtitle && (
        <span className="truncate text-sm text-slate-500" title={subtitle}>
          {subtitle}
        </span>
      )}
      {level === "error" && <XCircle size={13} className="shrink-0 text-red-600" />}
      {level === "warning" && <AlertTriangle size={13} className="shrink-0 text-amber-600" />}
      {action}
      <div className="grow" />
      <CloseButton label={`Close ${title.toLowerCase()} panel`} onClick={onClose} />
    </div>
  );
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded p-1 text-slate-500 hover:bg-slate-100"
      onClick={onClick}
      aria-label={label}
    >
      <X size={14} />
    </button>
  );
}

function FormScroll({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>;
}
