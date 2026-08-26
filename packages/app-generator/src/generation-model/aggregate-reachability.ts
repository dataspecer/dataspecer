import { type AssociationKind } from '../graph/types.ts';
import { type FieldKind } from '../metadata/types.ts';
import { hasNestedModel } from '../metadata/field-shape.ts';

interface AggregateReferenceField {
  kind: FieldKind;
  associationKind?: AssociationKind;
  targetAggregateIri?: string;
  targetClassIri?: string;
  fields?: readonly AggregateReferenceField[];
}

interface AggregateReferenceSource {
  iri: string;
  fields: readonly AggregateReferenceField[];
}

/** Returns aggregates used directly by operations or transitively by their field descriptors. */
export function collectReachableAggregateIris(
  startingIris: Iterable<string>,
  aggregates: Iterable<AggregateReferenceSource>,
): Set<string> {
  const reachable = new Set(startingIris);
  const aggregateByIri = new Map(
    [...aggregates].map((aggregate) => [aggregate.iri, aggregate] as const),
  );
  const pending = [...reachable];

  while (pending.length > 0) {
    const aggregate = aggregateByIri.get(pending.pop() as string);
    if (!aggregate) {
      continue;
    }
    for (const targetIri of referencedAggregateIris(aggregate.fields)) {
      if (!reachable.has(targetIri)) {
        reachable.add(targetIri);
        pending.push(targetIri);
      }
    }
  }

  return reachable;
}

function referencedAggregateIris(fields: readonly AggregateReferenceField[]): string[] {
  return fields.flatMap((field) => [
    ...(field.targetAggregateIri ? [field.targetAggregateIri] : []),
    ...(hasNestedModel(field) ? referencedAggregateIris(field.fields) : []),
  ]);
}
