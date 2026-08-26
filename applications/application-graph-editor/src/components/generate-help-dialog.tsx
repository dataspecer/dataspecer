import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2 } from 'lucide-react';
import { hideGenerateHelp } from '@/utils/generate-help.ts';

/** Explains how to run the downloaded application archive. */
export function GenerateHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [hideNextTime, setHideNextTime] = useState(false);

  const close = () => {
    if (hideNextTime) {
      hideGenerateHelp();
    }
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[32rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white p-4 shadow-lg">
          <Dialog.Title className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CheckCircle2 size={15} className="text-green-600" />
            Application downloaded
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-slate-600">
            To run the application:
          </Dialog.Description>
          <ol className="mt-2 list-decimal pl-5 text-sm text-slate-700">
            <li className="mb-1">Unzip the archive and open terminal in that folder.</li>
            <li className="mb-1">
              Run{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                npm install && npm run dev
              </code>{' '}
              (requires Node.js with npm).
            </li>
            <li>
              The application talks to the datasource configured in the graph. See the README inside
              the archive for details.
            </li>
          </ol>
          <div className="mt-4 flex items-center justify-between gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={hideNextTime}
                onChange={(event) => setHideNextTime(event.target.checked)}
              />
              Don't show this again
            </label>
            <button
              type="button"
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
              onClick={close}
            >
              OK
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
