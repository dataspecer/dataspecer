import type { ReactNode } from "react";

/**
 * A label/value row used to textually render operation metadata.
 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === "") {
    return null;
  }

  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="font-mono break-all">{children}</span>
    </div>
  );
}

/**
 * Renders a {@link LanguageString}-like record (`{en: "...", cs: "..."}`) as
 * a comma separated "lang: value" list.
 */
export function LanguageStringText({ value }: { value: Record<string, string> | null | undefined }) {
  if (!value || Object.keys(value).length === 0) {
    return <>—</>;
  }

  return (
    <>
      {Object.entries(value)
        .map(([lang, text]) => `${lang}: ${text}`)
        .join(", ")}
    </>
  );
}

export function CardinalityText({ value }: { value: readonly [number, number | null] | null | undefined }) {
  if (!value) {
    return <>—</>;
  }
  const [min, max] = value;
  return <>{min}..{max ?? "*"}</>;
}
