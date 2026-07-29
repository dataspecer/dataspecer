import type { ReactNode } from "react";
import { Hint } from "../hint.tsx";

export const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-500";

export function FormField({
  label,
  hint,
  action,
  asLabel = true,
  children,
}: {
  label: string;
  hint?: string;
  /** Rendered at the end of the label row, for example a link to the source of the value. */
  action?: ReactNode;
  asLabel?: boolean;
  children: ReactNode;
}) {
  const Wrapper = asLabel ? "label" : "div";

  return (
    <Wrapper className="block">
      <span className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-500">
        {label}
        {hint && <Hint text={hint} />}
        {action && (
          <>
            <span className="grow" />
            {action}
          </>
        )}
      </span>
      {children}
    </Wrapper>
  );
}
