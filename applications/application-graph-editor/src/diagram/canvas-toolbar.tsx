import { useRef, useState, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Panel, useReactFlow, useStore as useFlowStore } from "@xyflow/react";
import { ChevronDown, Hand, Menu, MousePointer2, Network, Plus, Redo2, Sparkles, Undo2 } from "lucide-react";
import { useStore } from "zustand";
import { downloadBlob } from "@/utils/download-blob.ts";
import { applyGraphJson } from "@/graph/apply-json.ts";
import { exportFileName } from "@/graph/file-names.ts";
import { newNode, nodeBlockedReason } from "@/graph/new-node.ts";
import { useEditorStore } from "@/store.ts";
import { autoLayout, type LayoutOptions } from "./auto-layout.ts";
import { centeredOn, paneToGraph } from "./pane-position.ts";
import { GenerateGraphDialog } from "./generate-graph-dialog.tsx";
import { ShortcutsDialog } from "./shortcuts-dialog.tsx";

export function CanvasToolbar() {
  const undo = useStore(useEditorStore.temporal, (state) => state.undo);
  const redo = useStore(useEditorStore.temporal, (state) => state.redo);
  const canUndo = useStore(useEditorStore.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(useEditorStore.temporal, (state) => state.futureStates.length > 0);
  const importInput = useRef<HTMLInputElement>(null);
  const metadata = useEditorStore((state) => state.metadata);
  const cannotAddNode = nodeBlockedReason(metadata);
  const canvasTool = useEditorStore((state) => state.canvasTool);
  const setCanvasTool = useEditorStore((state) => state.setCanvasTool);
  const empty = useEditorStore((state) => (state.graph?.nodes.length ?? 0) === 0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const flow = useReactFlow();
  const paneWidth = useFlowStore((state) => state.width);
  const paneHeight = useFlowStore((state) => state.height);

  const importFile = async (file: File) => {
    const { setActionError } = useEditorStore.getState();
    try {
      const { error } = await applyGraphJson(await file.text());
      setActionError(error && `Import failed: ${error}`);
    } catch (caught) {
      console.error(caught);
      setActionError(`Import failed: ${caught instanceof Error ? caught.message : String(caught)}`);
    }
  };

  const exportGraph = () => {
    const { graph } = useEditorStore.getState();
    if (graph === null) {
      return;
    }
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: "application/json" });
    downloadBlob(blob, exportFileName(graph));
  };

  const addNode = (aggregateIri: string) => {
    const { graph, addNode: add } = useEditorStore.getState();
    if (graph === null) {
      return;
    }
    // put it where the user is looking
    const center = centeredOn(paneToGraph(flow.getViewport(), { x: paneWidth / 2, y: paneHeight / 2 }));
    // keep freshly added nodes from covering each other
    const offset = (graph.nodes.length % 6) * 36;
    const node = newNode(graph, metadata, aggregateIri);
    add(node, { x: center.x + offset, y: center.y + offset });
  };

  const relayout = async (options: LayoutOptions) => {
    const { graph, setAllPositions, setActionError } = useEditorStore.getState();
    if (graph === null) {
      return;
    }
    try {
      setAllPositions(await autoLayout(graph, options));
    } catch (caught) {
      console.error(caught);
      setActionError(`Layout failed: ${caught instanceof Error ? caught.message : String(caught)}`);
    }
  };

  const addNodeMenu = (
    <Dropdown
      icon={<Plus size={14} />}
      label="Add node"
      showLabel
      disabled={cannotAddNode !== null}
      title={cannotAddNode ?? "Add a page for a data structure"}
    >
      <DropdownMenu.Label className="px-3 py-1 text-xs font-medium text-slate-400">
        Select data structure
      </DropdownMenu.Label>
      {(metadata?.aggregates ?? []).map((aggregate) => (
        <MenuItem key={aggregate.iri} onSelect={() => addNode(aggregate.iri)}>
          {aggregate.name}
        </MenuItem>
      ))}
    </Dropdown>
  );

  const generateButton = (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      onClick={() => setGenerateOpen(true)}
      disabled={cannotAddNode !== null}
      title={cannotAddNode ?? undefined}
    >
      <Sparkles size={14} />
      Generate graph
    </button>
  );

  return (
    <>
    <Panel position="top-left" className="flex gap-1">
      <Dropdown icon={<Menu size={14} />} label="Menu">
        <MenuItem onSelect={() => importInput.current?.click()}>Import</MenuItem>
        <MenuItem onSelect={exportGraph}>Export</MenuItem>
        <DropdownMenu.Separator className="my-1 border-t border-slate-100" />
        <MenuItem onSelect={() => useEditorStore.getState().setSettingsOpen(true)}>
          Settings
        </MenuItem>
        <DropdownMenu.Separator className="my-1 border-t border-slate-100" />
        <MenuItem onSelect={() => setShortcutsOpen(true)}>Shortcuts</MenuItem>
      </Dropdown>
      <ButtonGroup>
        <GroupButton
          onClick={() => setCanvasTool("pan")}
          active={canvasTool === "pan"}
          title="Drag to pan"
          aria-label="Pan tool"
        >
          <Hand size={14} />
        </GroupButton>
        <GroupButton
          onClick={() => setCanvasTool("select")}
          active={canvasTool === "select"}
          title="Drag to select"
          aria-label="Select tool"
        >
          <MousePointer2 size={14} />
        </GroupButton>
      </ButtonGroup>
      {addNodeMenu}
      {generateButton}
      <Dropdown icon={<Network size={14} />} label="Layout" showLabel>
        <MenuItem onSelect={() => void relayout({ algorithm: "stress" })}>Organic</MenuItem>
        <DropdownMenu.Separator className="my-1 border-t border-slate-100" />
        <MenuItem onSelect={() => void relayout({ algorithm: "layered", direction: "DOWN" })}>
          Top to bottom
        </MenuItem>
        <MenuItem onSelect={() => void relayout({ algorithm: "layered", direction: "RIGHT" })}>
          Left to right
        </MenuItem>
      </Dropdown>
      <ButtonGroup>
        <GroupButton
          onClick={() => undo()}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={14} />
        </GroupButton>
        <GroupButton
          onClick={() => redo()}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <Redo2 size={14} />
        </GroupButton>
      </ButtonGroup>
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <GenerateGraphDialog open={generateOpen} onClose={() => setGenerateOpen(false)} />
      <input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // the same file can be picked again after an undo
          event.target.value = "";
          if (file) {
            void importFile(file);
          }
        }}
      />
    </Panel>
    {empty && (
      <Panel position="top-center" style={{ top: "38%" }}>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-slate-500">
            This graph has no nodes yet. Add one, or generate the whole graph.
          </p>
          <div className="flex gap-2">
            {addNodeMenu}
            {generateButton}
          </div>
        </div>
      </Panel>
    )}
    </>
  );
}

function Dropdown({
  icon,
  label,
  showLabel,
  disabled,
  title,
  children,
}: {
  icon: ReactNode;
  label: string;
  showLabel?: boolean;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          disabled={disabled}
          title={title}
          aria-label={label}
        >
          {icon}
          {showLabel && label}
          {showLabel && <ChevronDown size={12} />}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="max-h-80 min-w-36 overflow-y-auto rounded border border-slate-200 bg-white py-1 shadow-md"
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ButtonGroup({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex overflow-hidden rounded border border-slate-300 bg-white">
      {children}
    </div>
  );
}

function GroupButton({
  children,
  onClick,
  disabled,
  active,
  title,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      className={`px-2 py-1 disabled:opacity-40 ${
        active ? "bg-slate-200 text-slate-800" : "text-slate-600 hover:bg-slate-100"
      }`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function MenuItem({
  children,
  onSelect,
  disabled,
}: {
  children: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu.Item
      className="cursor-default px-3 py-1 text-sm text-slate-700 outline-none data-highlighted:bg-slate-100 data-disabled:opacity-40"
      onSelect={onSelect}
      disabled={disabled}
    >
      {children}
    </DropdownMenu.Item>
  );
}
