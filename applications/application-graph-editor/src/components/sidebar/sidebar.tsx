import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { clamp } from "es-toolkit";
import { AlertTriangle, ChevronsLeft } from "lucide-react";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { useEditorStore, type SidebarTab } from "../../store.ts";
import { combinedViolations } from "../../validation/violations.ts";
import { EdgeForm } from "./edge-form.tsx";
import { JsonPanel } from "./json-panel.tsx";
import { NodeForm } from "./node-form.tsx";
import { ProblemsPanel } from "./problems-panel.tsx";
import { SettingsForm } from "./settings-form.tsx";

const MIN_WIDTH = 280;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 384;

/**
 * The resizable/collapsible right side panel. A selected node or edge shows its property form, the settings menu entry
 * shows the graph settings, and otherwise the panel shows the open sidebar tab with problems or the synchronized JSON
 * view.
 */
export function Sidebar({ graph }: { graph: ApplicationGraph }) {
  const selection = useEditorStore((state) => state.selection);
  const settingsOpen = useEditorStore((state) => state.settingsOpen);
  const sidebarTab = useEditorStore((state) => state.sidebarTab);
  const semanticValidation = useEditorStore((state) => state.semanticValidation);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  const lastTab = useRef<Exclude<SidebarTab, null>>("json");
  useEffect(() => {
    if (sidebarTab) {
      lastTab.current = sidebarTab;
    }
  }, [sidebarTab]);

  const problemCount = useMemo(
    () => combinedViolations(graph, semanticValidation).length,
    [graph, semanticValidation],
  );

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
    header = <PanelTitle title="Node" onClose={() => useEditorStore.getState().setSelection(null)} />;
    content = <FormScroll>{<NodeForm node={node} />}</FormScroll>;
  } else if (edge) {
    header = <PanelTitle title="Edge" onClose={() => useEditorStore.getState().setSelection(null)} />;
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
          {problemCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-600">
              <AlertTriangle size={12} />
              {problemCount}
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
      onWidthChange(clamp(startWidth + (startX - move.clientX), MIN_WIDTH, MAX_WIDTH));
    };
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
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
      className={`inline-flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-xs ${
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

function PanelTitle({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
      <span className="text-sm font-semibold text-slate-700">{title}</span>
      <CloseButton label={`Close ${title.toLowerCase()} panel`} onClick={onClose} />
    </div>
  );
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded px-2 text-slate-500 hover:bg-slate-100"
      onClick={onClick}
      aria-label={label}
    >
      ×
    </button>
  );
}

function FormScroll({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>;
}
