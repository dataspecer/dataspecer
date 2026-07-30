import * as Dialog from "@radix-ui/react-dialog";

const SHORTCUTS = [
  { keys: "Space + drag", what: "Pan with either tool" },
  { keys: "Shift + drag", what: "Select nodes" },
  { keys: "Ctrl + click", what: "Add to the selection" },
  { keys: "Escape", what: "Cancel the connection being dragged" },
  { keys: "Delete", what: "Remove selected element" },
  { keys: "Arrow keys", what: "Move the selected nodes" },
  { keys: "Ctrl + Z, Ctrl + Shift + Z", what: "Undo, redo" },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[24rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white p-4 shadow-lg">
          <Dialog.Title className="text-sm font-semibold text-slate-800">
            Canvas shortcuts
          </Dialog.Title>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {SHORTCUTS.map((shortcut) => (
              <div key={shortcut.keys} className="col-span-2 grid grid-cols-subgrid items-baseline">
                <dt className="whitespace-nowrap font-semibold text-slate-700">{shortcut.keys}</dt>
                <dd className="text-slate-600">{shortcut.what}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
