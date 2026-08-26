import type { GeneratedAggregateDescriptor } from './types.ts';

export function requireAggregate(
  aggregateByIri: ReadonlyMap<string, GeneratedAggregateDescriptor>,
  aggregateIri: string,
): GeneratedAggregateDescriptor {
  const aggregate = aggregateByIri.get(aggregateIri);
  if (!aggregate) {
    throw new Error(`Missing aggregate metadata for "${aggregateIri}".`);
  }
  return aggregate;
}
