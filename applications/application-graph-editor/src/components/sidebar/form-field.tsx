import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800";

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
