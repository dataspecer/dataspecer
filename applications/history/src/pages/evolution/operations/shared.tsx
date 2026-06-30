import { Translate } from "@/components/translate";
import { CardHeader } from "@/components/ui/card";
import { isSemanticModelClass, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { ReactNode } from "react";

export function OperationCardHeader({ title, entityName }: { title: string; entityName?: LanguageString | null }) {
  return (
    <CardHeader className="space-y-1 pb-3">
      <p className="text-base font-semibold">
        {title}
        {entityName && Object.keys(entityName).length > 0 && (
          <span className="text-muted-foreground font-normal"> · <Translate text={entityName} /></span>
        )}
      </p>
    </CardHeader>
  );
}

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

export function CardinalityText({ value }: { value: readonly [number, number | null] | null | undefined }) {
  if (!value) {
    return <>—</>;
  }
  const [min, max] = value;
  return <>{min}..{max ?? "*"}</>;
}

/** Looks up an entity by ID and renders its display name, falling back to the raw ID. */
export function EntityName({ entities, id, showIri }: {
  entities: Record<string, any> | null | undefined;
  id: string | null | undefined;
  showIri?: boolean;
}) {
  if (!id) return <>—</>;
  const entity = entities?.[id];

  let name: LanguageString | null = null;
  let iri: string | null = null;

  if (!entity) {
    iri = id;
  } else if (isSemanticModelClass(entity)) {
    name = entity?.name ?? null;
    iri = entity?.iri ?? null;
  } else if (isSemanticModelRelationship(entity)) {
    const end = entity.ends[1];
    name = end.name ?? null;
    iri = end.iri ?? null;
  }

  if (!name || Object.keys(name).length === 0) {
    showIri = true;
  }

  return (
    <>
      <Translate text={name} />
      {showIri && iri && <> <span className="opacity-60">({iri})</span></>}
    </>
  );
}

function langStr(v: Record<string, string> | null | undefined): string {
  if (!v || Object.keys(v).length === 0) return "";
  return Object.entries(v).map(([l, t]) => `${l}: ${t}`).join(", ");
}

/** Renders two LanguageString values side-by-side with red/green diff colouring. */
export function DiffLanguageStringText({
  current,
  next,
}: {
  current: Record<string, string> | null | undefined;
  next: Record<string, string> | null | undefined;
}) {
  const a = langStr(current);
  const b = langStr(next);
  if (a === b) return <Translate text={next} />;
  return (
    <>
      <span className="line-through text-red-500">{a || "—"}</span>
      {" → "}
      <span className="text-green-600 dark:text-green-400">{b || "—"}</span>
    </>
  );
}

/** Renders two string values side-by-side with red/green diff colouring. */
export function DiffStringText({
  current,
  next,
}: {
  current: string | null | undefined;
  next: string | null | undefined;
}) {
  const a = current ?? null;
  const b = next ?? null;
  if (a === b) return <>{a ?? "—"}</>;
  return (
    <>
      <span className="line-through text-red-500">{a || "—"}</span>
      {" → "}
      <span className="text-green-600 dark:text-green-400">{b || "—"}</span>
    </>
  );
}
