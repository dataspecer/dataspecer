import type { ApplicationNode } from '../../graph/types.ts';
import { type AggregateMetadata, FieldKind } from '../../metadata/types.ts';

export function haveSameClass(
  sourceNode: ApplicationNode,
  targetNode: ApplicationNode,
  aggregates: Map<string, AggregateMetadata>
): boolean {
  const sourceAggregate = aggregates.get(sourceNode.aggregateIri);
  const targetAggregate = aggregates.get(targetNode.aggregateIri);
  return (
    !!sourceAggregate && !!targetAggregate && sourceAggregate.classIri === targetAggregate.classIri
  );
}

export function hasAssociationToTarget(
  sourceNode: ApplicationNode,
  targetNode: ApplicationNode,
  aggregates: Map<string, AggregateMetadata>
): boolean {
  const sourceAggregate = aggregates.get(sourceNode.aggregateIri);
  const targetAggregate = aggregates.get(targetNode.aggregateIri);
  if (!sourceAggregate || !targetAggregate) {
    return false;
  }

  return sourceAggregate.fields.some(
    (field) =>
      field.kind === FieldKind.Association &&
      (field.targetAggregateIri === targetAggregate.iri ||
        field.targetClassIri === targetAggregate.classIri)
  );
}
