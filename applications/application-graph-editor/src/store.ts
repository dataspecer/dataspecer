import { create } from "zustand";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";

export type NodePositions = Record<string, { x: number; y: number }>;

interface EditorState {
  graph: ApplicationGraph | null;
  /** Canvas positions by node id. Kept outside the graph JSON, which allows no extra fields. */
  positions: NodePositions;
  loadState: "loading" | "ready" | "error";
  loadError: string | null;
  jsonPanelOpen: boolean;

  initialize: (graph: ApplicationGraph, positions: NodePositions) => void;
  failLoad: (message: string) => void;
  setJsonPanelOpen: (open: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  graph: null,
  positions: {},
  loadState: "loading",
  loadError: null,
  jsonPanelOpen: true,

  initialize: (graph, positions) =>
    set({ graph, positions, loadState: "ready", loadError: null }),
  failLoad: (message) => set({ loadState: "error", loadError: message }),
  setJsonPanelOpen: (open) => set({ jsonPanelOpen: open }),
}));
