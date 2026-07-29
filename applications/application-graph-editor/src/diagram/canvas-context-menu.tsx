import type { ReactNode } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { EdgeType } from "@dataspecer/app-generator/graph";
import { useEditorStore } from "../store.ts";

export type ContextTarget = { kind: "node" | "edge"; id: string } | null;

export function CanvasContextMenu({
  target,
  onClose,
  children,
}: {
  target: ContextTarget;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <ContextMenu.Root
      open={target !== null}
      onOpenChange={(next) => !next && onClose()}
      modal={false}
    >
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      {target !== null && (
        <ContextMenu.Portal>
          <ContextMenu.Content className="min-w-40 rounded border border-slate-200 bg-white py-1 shadow-md">
            {target.kind === "edge" && <EdgeTypeItem edgeId={target.id} />}
            <Item
              onSelect={() => {
                const store = useEditorStore.getState();
                if (target.kind === "node") {
                  store.removeNode(target.id);
                } else {
                  store.removeEdge(target.id);
                }
              }}
            >
              Delete {target.kind}
            </Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      )}
    </ContextMenu.Root>
  );
}

function EdgeTypeItem({ edgeId }: { edgeId: string }) {
  const edge = useEditorStore((state) =>
    state.graph?.edges.find((candidate) => candidate.id === edgeId),
  );
  if (!edge) {
    return null;
  }
  const next = edge.type === EdgeType.Redirect ? EdgeType.Transition : EdgeType.Redirect;

  return (
    <Item onSelect={() => useEditorStore.getState().updateEdge(edgeId, { type: next })}>
      Switch to {next}
    </Item>
  );
}

function Item({ children, onSelect }: { children: ReactNode; onSelect: () => void }) {
  return (
    <ContextMenu.Item
      className="cursor-default px-3 py-1 text-sm text-slate-700 outline-none data-highlighted:bg-slate-100"
      onSelect={onSelect}
    >
      {children}
    </ContextMenu.Item>
  );
}
