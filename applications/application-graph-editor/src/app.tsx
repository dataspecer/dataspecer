import { useEffect, useMemo, type ReactNode } from "react";
import { Background, Controls, ReactFlow } from "@xyflow/react";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { loadGraph } from "./backend/client.ts";
import { JsonPanel } from "./components/json-panel.tsx";
import { autoLayout } from "./diagram/auto-layout.ts";
import { graphToFlow } from "./diagram/graph-to-flow.ts";
import { OperationNode } from "./diagram/operation-node.tsx";
import { useEditorStore } from "./store.ts";

const nodeTypes = { operation: OperationNode };

export function App() {
  const loadState = useEditorStore((state) => state.loadState);
  const loadError = useEditorStore((state) => state.loadError);
  const graph = useEditorStore((state) => state.graph);

  useEffect(() => {
    const iri = new URLSearchParams(window.location.search).get("iri");
    if (!iri) {
      useEditorStore.getState().failLoad("Missing the ?iri query parameter.");
      return;
    }

    let active = true;
    (async () => {
      const loaded: ApplicationGraph = await loadGraph(iri);
      const positions = await autoLayout(loaded);
      if (active) {
        useEditorStore.getState().initialize(loaded, positions);
      }
    })().catch((caught: unknown) => {
      console.error(caught);
      if (active) {
        useEditorStore
          .getState()
          .failLoad(caught instanceof Error ? caught.message : String(caught));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (loadState === "loading") {
    return <Centered>Loading application graph…</Centered>;
  }
  if (loadState === "error" || graph === null) {
    return <Centered>{loadError ?? "Failed to load the application graph."}</Centered>;
  }
  return <Editor graph={graph} />;
}

function Editor({ graph }: { graph: ApplicationGraph }) {
  const positions = useEditorStore((state) => state.positions);
  const jsonPanelOpen = useEditorStore((state) => state.jsonPanelOpen);
  const setJsonPanelOpen = useEditorStore((state) => state.setJsonPanelOpen);

  const { nodes, edges } = useMemo(() => graphToFlow(graph, positions), [graph, positions]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <h1 className="text-sm font-semibold text-slate-800">{graph.name}</h1>
        <span className="text-xs text-slate-400">application graph</span>
        <div className="grow" />
        {!jsonPanelOpen && (
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            onClick={() => setJsonPanelOpen(true)}
          >
            JSON
          </button>
        )}
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        {jsonPanelOpen && <JsonPanel graph={graph} />}
      </div>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-600">
      {children}
    </div>
  );
}
