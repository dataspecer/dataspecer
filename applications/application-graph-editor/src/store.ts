import { create } from "zustand";
import { temporal } from "zundo";
import type {
  ApplicationEdge,
  ApplicationGraph,
  ApplicationNode,
  SpecificationMetadata,
} from "@dataspecer/app-generator/graph";
import * as mutations from "./graph/mutations.ts";

export type NodePositions = Record<string, { x: number; y: number }>;

export type Selection = { kind: "node" | "edge"; id: string } | null;

export type SaveState = "saved" | "saving" | "error";

/** The part of the state that undo and redo travel through. */
interface UndoableState {
  graph: ApplicationGraph | null;
  /** Canvas positions by node id. Kept outside the graph JSON, which allows no extra fields. */
  positions: NodePositions;
}

interface EditorState extends UndoableState {
  resourceIri: string | null;
  loadState: "loading" | "ready" | "error";
  loadError: string | null;
  /** Aggregates of the graph's data specification. Null while loading or when the fetch failed. */
  metadata: SpecificationMetadata | null;
  saveState: SaveState;
  selection: Selection;
  jsonPanelOpen: boolean;
  settingsOpen: boolean;

  initialize: (resourceIri: string, graph: ApplicationGraph, positions: NodePositions) => void;
  failLoad: (message: string) => void;
  setMetadata: (metadata: SpecificationMetadata | null) => void;
  setSaveState: (state: SaveState) => void;
  setSelection: (selection: Selection) => void;
  setJsonPanelOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;

  addNode: (node: ApplicationNode, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, patch: Partial<Omit<ApplicationNode, "id">>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: ApplicationEdge) => void;
  updateEdge: (edgeId: string, patch: Partial<Omit<ApplicationEdge, "id">>) => void;
  removeEdge: (edgeId: string) => void;
  updateGraphMeta: (patch: Partial<Pick<ApplicationGraph, "name" | "dataSpecificationIri" | "datasources">>) => void;
  setNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  setAllPositions: (positions: NodePositions) => void;
}

function withGraph(
  state: EditorState,
  mutate: (graph: ApplicationGraph) => ApplicationGraph,
): Partial<EditorState> {
  if (state.graph === null) {
    return {};
  }
  return { graph: mutate(state.graph) };
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
      graph: null,
      positions: {},
      resourceIri: null,
      loadState: "loading",
      loadError: null,
      metadata: null,
      saveState: "saved",
      selection: null,
      jsonPanelOpen: true,
      settingsOpen: false,

      initialize: (resourceIri, graph, positions) =>
        set({ resourceIri, graph, positions, loadState: "ready", loadError: null }),
      failLoad: (message) => set({ loadState: "error", loadError: message }),
      setMetadata: (metadata) => set({ metadata }),
      setSaveState: (saveState) => set({ saveState }),
      setSelection: (selection) => set({ selection, settingsOpen: false }),
      setJsonPanelOpen: (open) => set({ jsonPanelOpen: open }),
      setSettingsOpen: (open) =>
        set(open ? { settingsOpen: true, selection: null } : { settingsOpen: false }),

      addNode: (node, position) =>
        set((state) => ({
          ...withGraph(state, (graph) => mutations.addNode(graph, node)),
          positions: { ...state.positions, [node.id]: position },
          selection: { kind: "node", id: node.id },
          settingsOpen: false,
        })),
      updateNode: (nodeId, patch) =>
        set((state) => withGraph(state, (graph) => mutations.updateNode(graph, nodeId, patch))),
      removeNode: (nodeId) =>
        set((state) => {
          const positions = { ...state.positions };
          delete positions[nodeId];
          return {
            ...withGraph(state, (graph) => mutations.removeNode(graph, nodeId)),
            positions,
            selection: state.selection?.id === nodeId ? null : state.selection,
          };
        }),
      addEdge: (edge) =>
        set((state) => ({
          ...withGraph(state, (graph) => mutations.addEdge(graph, edge)),
          selection: { kind: "edge", id: edge.id },
          settingsOpen: false,
        })),
      updateEdge: (edgeId, patch) =>
        set((state) => withGraph(state, (graph) => mutations.updateEdge(graph, edgeId, patch))),
      removeEdge: (edgeId) =>
        set((state) => ({
          ...withGraph(state, (graph) => mutations.removeEdge(graph, edgeId)),
          selection: state.selection?.id === edgeId ? null : state.selection,
        })),
      updateGraphMeta: (patch) =>
        set((state) => withGraph(state, (graph) => ({ ...graph, ...patch }))),
      setNodePosition: (nodeId, position) =>
        set((state) => ({ positions: { ...state.positions, [nodeId]: position } })),
      setAllPositions: (positions) => set({ positions }),
    }),
    {
      partialize: (state): UndoableState => ({ graph: state.graph, positions: state.positions }),
      // reference equality is enough, every mutation builds new graph and position objects
      equality: (a, b) => a.graph === b.graph && a.positions === b.positions,
      limit: 100,
    },
  ),
);

if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__appGraphEditorStore = useEditorStore;
}
