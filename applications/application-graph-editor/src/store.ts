import { create } from "zustand";
import { temporal } from "zundo";
import { debounce, mapKeys, omit } from "es-toolkit";
import type {
  ApplicationEdge,
  ApplicationGraph,
  ApplicationNode,
  SpecificationMetadata,
} from "@dataspecer/app-generator/graph";
import * as mutations from "./graph/mutations.ts";
import type { GenerationViolations, ValidationSnapshot } from "./validation/violations.ts";

export type NodePositions = Record<string, { x: number; y: number }>;

export type Selection = { kind: "node" | "edge"; id: string } | null;

/** The sidebar view when nothing is selected. Null collapses the sidebar. */
export type SidebarTab = "problems" | "json" | null;

export type SaveState = "saved" | "saving" | "error" | "invalid";

/** One-shot request to bring a node or edge into view. The seq makes repeats distinct. */
export interface FocusRequest {
  id: string;
  seq: number;
}

/** The part of the state that undo and redo travel through. */
interface UndoableState {
  graph: ApplicationGraph | null;
  /** Canvas positions by node ID. Kept outside the graph JSON, which allows no extra fields. */
  positions: NodePositions;
  selection: Selection;
}

interface EditorState extends UndoableState {
  resourceIri: string | null;
  loadState: "loading" | "ready" | "error";
  loadError: string | null;
  /** Aggregates of the graph's data specification. Null while loading or when the fetch failed. */
  metadata: SpecificationMetadata | null;
  metadataError: string | null;
  saveState: SaveState;
  /** Element the JSON cursor points at. Highlighted on the canvas without taking the panel. */
  highlight: Selection;
  sidebarTab: SidebarTab;
  /**
   * Edited text of the raw data panel with the JSON it started from, null while the view follows
   * the graph.
   */
  jsonDraft: JsonDraft | null;
  settingsOpen: boolean;
  /** Error of the last user action (import, generate), shown in a dismissible strip. */
  actionError: string | null;
  /** Question waiting for an answer in the confirmation dialog. */
  confirmRequest: ConfirmRequest | null;
  /** Violations from the last failed generation, dropped once the graph changes. */
  generationViolations: GenerationViolations | null;
  /** The last computed violations with the graph they belong to. Null until the first pass. */
  validation: ValidationSnapshot | null;
  focusRequest: FocusRequest | null;

  initialize: (resourceIri: string, graph: ApplicationGraph, positions: NodePositions) => void;
  failLoad: (message: string) => void;
  /** Stores loaded metadata (or clears it while loading) and clears the metadata error. */
  setMetadata: (metadata: SpecificationMetadata | null) => void;
  /** Records a failed metadata fetch, clearing any previously loaded metadata. */
  failMetadata: (message: string) => void;
  setSaveState: (state: SaveState) => void;
  setSelection: (selection: Selection) => void;
  setHighlight: (highlight: Selection) => void;
  /** Opens a sidebar tab, dropping whatever took the panel over so the tab becomes visible. */
  setSidebarTab: (tab: SidebarTab) => void;
  setSettingsOpen: (open: boolean) => void;
  setJsonDraft: (draft: JsonDraft | null) => void;
  setActionError: (message: string | null) => void;
  /** Asks the user through the confirmation dialog and resolves with the answer. */
  requestConfirm: (question: ConfirmQuestion) => Promise<boolean>;
  answerConfirm: (confirmed: boolean) => void;
  setGenerationViolations: (violations: GenerationViolations | null) => void;
  setValidation: (validation: ValidationSnapshot) => void;
  requestFocus: (id: string) => void;

  addNode: (node: ApplicationNode, position: { x: number; y: number }) => void;
  /** Adds a node and the edge reaching it in one undoable step. */
  addConnectedNode: (
    node: ApplicationNode,
    position: { x: number; y: number },
    edge: ApplicationEdge,
  ) => void;
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

export interface ConfirmQuestion {
  title: string;
  message: string;
  /** Lines under the message, such as the warnings that do not block generation. */
  details?: string[];
  /** Label of the confirming button, "Continue" when not given. */
  confirmLabel?: string;
}

export interface JsonDraft {
  text: string;
  /** Serialized graph the editing started from. */
  base: string;
}

/** A pending question, with the resolver of the promise waiting on the answer. */
interface ConfirmRequest extends ConfirmQuestion {
  resolve: (confirmed: boolean) => void;
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

/**
 * Changes that keep arriving within this delay become one undo step instead of one each. The recorder that does it is
 * kept here so that an undo can close the run it leaves open.
 */
const HISTORY_MERGE_MS = 500;
let recordStep: { cancel: () => void } | null = null;

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      graph: null,
      positions: {},
      resourceIri: null,
      loadState: "loading",
      loadError: null,
      metadata: null,
      metadataError: null,
      saveState: "saved",
      selection: null,
      highlight: null,
      sidebarTab: "json",
      jsonDraft: null,
      settingsOpen: false,
      actionError: null,
      confirmRequest: null,
      generationViolations: null,
      validation: null,
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
      setHighlight: (highlight) => set({ highlight }),
      setSidebarTab: (sidebarTab) =>
        set(
          sidebarTab === null
            ? { sidebarTab }
            : { sidebarTab, selection: null, settingsOpen: false },
        ),
      setJsonDraft: (jsonDraft) => set({ jsonDraft }),
      setActionError: (actionError) => set({ actionError }),
      requestConfirm: (question) =>
        new Promise((resolve) => {
          // a replaced question counts as declined, so nothing keeps waiting on it
          get().confirmRequest?.resolve(false);
          set({ confirmRequest: { ...question, resolve } });
        }),
      answerConfirm: (confirmed) => {
        const request = get().confirmRequest;
        set({ confirmRequest: null });
        request?.resolve(confirmed);
      },
      setSettingsOpen: (open) =>
        set(open ? { settingsOpen: true, selection: null } : { settingsOpen: false }),
      setGenerationViolations: (generationViolations) => set({ generationViolations }),
      setValidation: (validation) => set({ validation }),
      requestFocus: (id) =>
        set((state) => ({ focusRequest: { id, seq: (state.focusRequest?.seq ?? 0) + 1 } })),

      addNode: (node, position) =>
        set((state) => ({
          ...withGraph(state, (graph) => mutations.addNode(graph, node)),
          positions: { ...state.positions, [node.id]: position },
          selection: { kind: "node", id: node.id },
          settingsOpen: false,
        })),
      addConnectedNode: (node, position, edge) =>
        set((state) => ({
          ...withGraph(state, (graph) =>
            mutations.addEdge(mutations.addNode(graph, node), edge),
          ),
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
      partialize: (state): UndoableState => ({
        graph: state.graph,
        positions: state.positions,
        selection: state.selection,
      }),
      equality: (a, b) =>
        // reference equality is enough, every mutation builds new graph and position objects
        (a.graph === b.graph && a.positions === b.positions) ||
        // loading the graph is not a step, so the first edit is not merged into it
        a.graph === null,
      handleSet: (record) => {
        const debounced = debounce(record, HISTORY_MERGE_MS, { edges: ["leading"] });
        recordStep = debounced;
        return debounced;
      },
      limit: 100,
    },
  ),
);

if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__appGraphEditorStore = useEditorStore;
}

// An undo moves a state between the stacks without going through the recorder, so the run it
// leaves behind ends with it and the next change opens a step of its own.
useEditorStore.temporal.subscribe((state, previous) => {
  if (state.futureStates.length > previous.futureStates.length) {
    recordStep?.cancel();
  }
});
