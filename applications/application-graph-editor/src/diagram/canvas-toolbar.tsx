import { useRef } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Panel } from "@xyflow/react";
import { Menu, Network, Plus, Redo2, Undo2 } from "lucide-react";
import { useStore } from "zustand";
import { Operation } from "@dataspecer/app-generator/graph";
import { ToolbarButton } from "../components/toolbar-button.tsx";
import { downloadBlob } from "../utils/download-blob.ts";
import { applyGraphJson } from "../graph/apply-json.ts";
import { exportFileName } from "../graph/file-names.ts";
import { nextNodeId } from "../graph/mutations.ts";
import { useEditorStore } from "../store.ts";
import { autoLayout } from "./auto-layout.ts";

export function CanvasToolbar() {
  const { undo, redo, pastStates, futureStates } = useStore(useEditorStore.temporal);
  const importInput = useRef<HTMLInputElement>(null);

  const importFile = async (file: File) => {
    const problem = await applyGraphJson(await file.text());
    useEditorStore.getState().setActionError(problem && `Import failed: ${problem}`);
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
    const aggregate = metadata?.aggregates[0];
    const operation = Operation.ReadList;
    const id = nextNodeId(graph, aggregate?.name ?? "node", operation);
    // keep freshly added nodes from covering each other
    const offset = (graph.nodes.length % 6) * 36;
    useEditorStore.getState().addNode(
      { id, aggregateIri: aggregate?.iri ?? "", operation },
      { x: 60 + offset, y: 60 + offset },
    );
  };

  const relayout = async () => {
    const { graph, setAllPositions } = useEditorStore.getState();
    if (graph !== null) {
      setAllPositions(await autoLayout(graph));
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
      <ToolbarButton onClick={() => void relayout()}>
        <Network size={14} /> Layout
      </ToolbarButton>
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
