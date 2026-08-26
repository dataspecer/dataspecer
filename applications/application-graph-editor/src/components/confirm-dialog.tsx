import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import { useEditorStore } from '@/store.ts';

/** Answers the pending confirmation request, if there is one. */
export function ConfirmDialog() {
  const request = useEditorStore((state) => state.confirmRequest);
  const answer = useEditorStore((state) => state.answerConfirm);

  return (
    <Dialog.Root open={request !== null} onOpenChange={(open) => !open && answer(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[32rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white p-4 shadow-lg">
          <Dialog.Title className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <AlertTriangle size={15} className="text-amber-600" />
            {request?.title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-slate-600">
            {request?.message}
          </Dialog.Description>
          {request?.details && (
            <ul className="mt-3 max-h-56 list-disc overflow-y-auto pl-5 text-sm text-slate-700">
              {request.details.map((detail, index) => (
                <li key={index} className="mb-1">
                  {detail}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              onClick={() => answer(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => answer(true)}
            >
              {request?.confirmLabel ?? 'Continue'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
