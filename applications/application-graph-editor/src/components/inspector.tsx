import type { ReactNode } from "react";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { useEditorStore } from "../store.ts";
import { EdgeForm } from "./edge-form.tsx";
import { JsonPanel } from "./json-panel.tsx";
import { NodeForm } from "./node-form.tsx";
import { SettingsForm } from "./settings-form.tsx";

/**
 * The right side panel. A selected node or edge shows its property form, the settings button
 * shows the graph settings, and otherwise the synchronized JSON view is shown when enabled.
 */
export function Inspector({ graph }: { graph: ApplicationGraph }) {
  const selection = useEditorStore((state) => state.selection);
  const settingsOpen = useEditorStore((state) => state.settingsOpen);
  const jsonPanelOpen = useEditorStore((state) => state.jsonPanelOpen);

  const node =
    selection?.kind === "node"
      ? graph.nodes.find((candidate) => candidate.id === selection.id)
      : undefined;
  const edge =
    selection?.kind === "edge"
      ? graph.edges.find((candidate) => candidate.id === selection.id)
      : undefined;

  if (node) {
    return <Panel title="Node">{<NodeForm node={node} />}</Panel>;
  }
  if (edge) {
    return <Panel title="Edge">{<EdgeForm edge={edge} />}</Panel>;
  }
  if (settingsOpen) {
    return <Panel title="Graph settings">{<SettingsForm graph={graph} />}</Panel>;
  }
  if (jsonPanelOpen) {
    return <JsonPanel graph={graph} />;
  }
  return null;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
        {title}
      </div>
      {children}
    </aside>
  );
}
