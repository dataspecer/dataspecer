import { create } from "zustand";
import { temporal } from "zundo";
import { mapKeys, omit } from "es-toolkit";
import type {
  ApplicationEdge,
  ApplicationGraph,
  ApplicationNode,
  SpecificationMetadata,
  Violation,
} from "@dataspecer/app-generator/graph";
import * as mutations from "./graph/mutations.ts";

export type NodePositions = Record<string, { x: number; y: number }>;

export type Selection = { kind: "node" | "edge"; id: string } | null;

/** The sidebar view when nothing is selected. Null collapses the sidebar. */
export type SidebarTab = "problems" | "json" | null;

export type SaveState = "saved" | "saving" | "error";

/** Result of the backend validation, tied to the graph snapshot it was computed for. */
export interface SemanticValidation {
  violations: Violation[];
  forGraph: ApplicationGraph;
}

/** One-shot request to bring a node or edge into view. The seq makes repeats distinct. */
export interface FocusRequest {
  id: string;
  seq: number;
}

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
  metadataError: string | null;
  saveState: SaveState;
  selection: Selection;
  sidebarTab: SidebarTab;
  settingsOpen: boolean;
  /** Error of the last user action (import, generate), shown in a dismissible strip. */
  actionError: string | null;
  semanticValidation: SemanticValidation | null;
  focusRequest: FocusRequest | null;

  initialize: (resourceIri: string, graph: ApplicationGraph, positions: NodePositions) => void;
  failLoad: (message: string) => void;
  /** Stores loaded metadata (or clears it while loading) and clears the metadata error. */
  setMetadata: (metadata: SpecificationMetadata | null) => void;
  /** Records a failed metadata fetch, clearing any previously loaded metadata. */
  failMetadata: (message: string) => void;
  setSaveState: (state: SaveState) => void;
  setSelection: (selection: Selection) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setSettingsOpen: (open: boolean) => void;
  setActionError: (message: string | null) => void;
  setSemanticValidation: (validation: SemanticValidation | null) => void;
  requestFocus: (id: string) => void;

  addNode: (node: ApplicationNode, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, patch: Partial<Omit<ApplicationNode, "id">>) => void;
  /** Renames a node, optionally applying a patch in the same undoable step. */
  renameNode: (
    currentId: string,
    newId: string,
    patch?: Partial<Omit<ApplicationNode, "id">>,
  ) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: ApplicationEdge) => void;
  updateEdge: (edgeId: string, patch: Partial<Omit<ApplicationEdge, "id">>) => void;
  removeEdge: (edgeId: string) => void;
  updateGraphMeta: (patch: Partial<Pick<ApplicationGraph, "name" | "dataSpecificationIri" | "datasources">>) => void;
  /** Replaces the whole graph, for imports and JSON panel edits. Undo restores the old one. */
  replaceGraph: (graph: ApplicationGraph, positions: NodePositions) => void;
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
      metadataError: null,
      saveState: "saved",
      selection: null,
      sidebarTab: "json",
      settingsOpen: false,
      actionError: null,
      semanticValidation: null,
      focusRequest: null,

      initialize: (resourceIri, graph, positions) =>
        set({
          resourceIri,
          graph,
          positions,
          loadState: "ready",
          loadError: null,
          metadata: null,
          metadataError: null,
        }),
      failLoad: (message) => set({ loadState: "error", loadError: message }),
      setMetadata: (metadata) => set({ metadata, metadataError: null }),
      failMetadata: (metadataError) => set({ metadata: null, metadataError }),
      setSaveState: (saveState) => set({ saveState }),
      setSelection: (selection) => set({ selection, settingsOpen: false }),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      setActionError: (actionError) => set({ actionError }),
      setSettingsOpen: (open) =>
        set(open ? { settingsOpen: true, selection: null } : { settingsOpen: false }),
      setSemanticValidation: (semanticValidation) => set({ semanticValidation }),
      requestFocus: (id) =>
        set((state) => ({ focusRequest: { id, seq: (state.focusRequest?.seq ?? 0) + 1 } })),

      addNode: (node, position) =>
        set((state) => ({
          ...withGraph(state, (graph) => mutations.addNode(graph, node)),
          positions: { ...state.positions, [node.id]: position },
          selection: { kind: "node", id: node.id },
          settingsOpen: false,
        })),
      updateNode: (nodeId, patch) =>
        set((state) => withGraph(state, (graph) => mutations.updateNode(graph, nodeId, patch))),
      renameNode: (currentId, newId, patch) =>
        set((state) => ({
          ...withGraph(state, (graph) => {
            const renamed = mutations.renameNode(graph, currentId, newId);
            return patch ? mutations.updateNode(renamed, newId, patch) : renamed;
          }),
          positions: mapKeys(state.positions, (_position, key) =>
            key === currentId ? newId : key,
          ),
          selection:
            state.selection?.id === currentId ? { kind: "node", id: newId } : state.selection,
        })),
      removeNode: (nodeId) =>
        set((state) => ({
          ...withGraph(state, (graph) => mutations.removeNode(graph, nodeId)),
          positions: omit(state.positions, [nodeId]),
          selection: state.selection?.id === nodeId ? null : state.selection,
        })),
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
      replaceGraph: (graph, positions) => set({ graph, positions, selection: null }),
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
