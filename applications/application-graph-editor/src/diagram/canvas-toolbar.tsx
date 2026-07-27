import { useRef, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Panel } from "@xyflow/react";
import { ChevronDown, Menu, Network, Plus, Redo2, Undo2 } from "lucide-react";
import { useStore } from "zustand";
import { downloadBlob } from "../utils/download-blob.ts";
import { applyGraphJson } from "../graph/apply-json.ts";
import { exportFileName } from "../graph/file-names.ts";
import { newNode } from "../graph/new-node.ts";
import { useEditorStore } from "../store.ts";
import { autoLayout, type LayoutOptions } from "./auto-layout.ts";

export function CanvasToolbar() {
  const { undo, redo, pastStates, futureStates } = useStore(useEditorStore.temporal);
  const importInput = useRef<HTMLInputElement>(null);

  const importFile = async (file: File) => {
    const { error } = await applyGraphJson(await file.text());
    useEditorStore.getState().setActionError(error && `Import failed: ${error}`);
  };

  const exportGraph = () => {
    const { graph } = useEditorStore.getState();
    if (graph === null) {
      return;
    }
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: "application/json" });
    downloadBlob(blob, exportFileName(graph));
  };

  const addNode = () => {
    const { graph, metadata } = useEditorStore.getState();
    if (graph === null) {
      return;
    }
    // keep freshly added nodes from covering each other
    const offset = (graph.nodes.length % 6) * 36;
    useEditorStore
      .getState()
      .addNode(newNode(graph, metadata), { x: 60 + offset, y: 60 + offset });
  };

  const relayout = async (options: LayoutOptions) => {
    const { graph, setAllPositions } = useEditorStore.getState();
    if (graph !== null) {
      setAllPositions(await autoLayout(graph, options));
    }
  };

  return (
    <Panel position="top-left" className="flex gap-1">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center rounded border border-slate-300 bg-white px-2 py-1 text-slate-600 hover:bg-slate-100"
            aria-label="Menu"
          >
            <Menu size={14} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className="min-w-36 rounded border border-slate-200 bg-white py-1 shadow-md"
          >
            <MenuItem onSelect={() => importInput.current?.click()}>Import</MenuItem>
            <MenuItem onSelect={exportGraph}>Export</MenuItem>
            <DropdownMenu.Separator className="my-1 border-t border-slate-100" />
            <MenuItem onSelect={() => useEditorStore.getState().setSettingsOpen(true)}>
              Settings
            </MenuItem>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <ToolbarButton onClick={addNode}>
        <Plus size={14} /> Add node
      </ToolbarButton>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            <Network size={14} /> Layout
            <ChevronDown size={12} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className="min-w-36 rounded border border-slate-200 bg-white py-1 shadow-md"
          >
            <MenuItem onSelect={() => void relayout({ algorithm: "stress" })}>Organic</MenuItem>
            <DropdownMenu.Separator className="my-1 border-t border-slate-100" />
            <MenuItem onSelect={() => void relayout({ algorithm: "layered", direction: "DOWN" })}>
              Top to bottom
            </MenuItem>
            <MenuItem onSelect={() => void relayout({ algorithm: "layered", direction: "RIGHT" })}>
              Left to right
            </MenuItem>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <ToolbarButton
        onClick={() => undo()}
        disabled={pastStates.length === 0}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <Undo2 size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => redo()}
        disabled={futureStates.length === 0}
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
      >
        <Redo2 size={14} />
      </ToolbarButton>
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
  );
}

function MenuItem({ children, onSelect }: { children: string; onSelect: () => void }) {
  return (
    <DropdownMenu.Item
      className="cursor-default px-3 py-1 text-xs text-slate-700 outline-none data-highlighted:bg-slate-100"
      onSelect={onSelect}
    >
      {children}
    </DropdownMenu.Item>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  title,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
