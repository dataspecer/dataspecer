import {
  FieldKind,
  type AggregateFieldMetadata,
  type AggregateMetadata,
} from '../metadata/types.ts';
import { splitFieldPath } from './field-path.ts';

/**
 * Resolves a dotted config path to the chain of association fields it addresses within the
 * aggregate's structure tree. Returns undefined when any segment is missing or is not an
 * association.
 */
export function resolveAssociationChain(
  aggregate: AggregateMetadata,
  path: string
): AggregateFieldMetadata[] | undefined {
  let fields = aggregate.fields;
  const chain: AggregateFieldMetadata[] = [];

  for (const segment of splitFieldPath(path)) {
    const field = fields.find(
      (candidate) => candidate.path === segment && candidate.kind === FieldKind.Association
    );
    if (!field) {
      return undefined;
    }
    chain.push(field);
    fields = field.fields ?? [];
  }

  return chain.length > 0 ? chain : undefined;
}

/**
 * Finds the association chain in another aggregate that addresses the same semantic associations.
 * Fields match by property IRI, or by technical label when property IRIs are not available.
 * Structures of the same class can model different subsets of its properties, so a chain may
 * have no counterpart in the other aggregate.
 */
export function findMatchingChain(
  aggregate: AggregateMetadata,
  chain: AggregateFieldMetadata[]
): AggregateFieldMetadata[] | undefined {
  let fields = aggregate.fields;
  const matched: AggregateFieldMetadata[] = [];

  for (const source of chain) {
    const field = fields.find(
      (candidate) => candidate.kind === FieldKind.Association && matchesField(candidate, source)
    );
    if (!field) {
      return undefined;
    }
    matched.push(field);
    fields = field.fields ?? [];
  }

  return matched;
}

/**
 * Identity of an association chain within a class. Aggregates of the same class refer to the
 * same semantic association through it, so kinds configured on different aggregates can be
 * compared.
 */
export function chainIdentity(classIri: string, chain: AggregateFieldMetadata[]): string {
  return [classIri, ...chain.map((field) => field.propertyIri ?? field.path)].join('\n');
}

function matchesField(candidate: AggregateFieldMetadata, source: AggregateFieldMetadata): boolean {
  if (candidate.propertyIri && source.propertyIri) {
    return candidate.propertyIri === source.propertyIri;
  }
  return candidate.path === source.path;
}
