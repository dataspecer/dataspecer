import * as Tooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';

/** An info icon explaining the field it sits next to. */
export function Hint({ text }: { text: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className="inline-flex cursor-help text-slate-400">
          <Info size={12} />
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          align="start"
          className="max-w-64 rounded border border-slate-200 bg-white px-2 py-1 text-sm font-normal text-slate-600 shadow-md"
        >
          {text}
          <Tooltip.Arrow className="fill-white" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
