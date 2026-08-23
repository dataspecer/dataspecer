import {
  FieldKind,
  type AggregateFieldMetadata,
  type AggregateMetadata,
} from '../metadata/types.ts';
import { compositeKey } from '../utils/composite-key.ts';
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

/** Identifies the final association by its owning class, predicate, and direction. */
export function chainIdentity(classIri: string, chain: AggregateFieldMetadata[]): string {
  const field = chain.at(-1);
  if (!field) {
    throw new Error('Association chain is empty.');
  }

  const ownerClassIri = chain
    .slice(0, -1)
    .reduce((owner, parent) => parent.targetClassIri ?? owner, classIri);
  return compositeKey(
    ownerClassIri,
    field.isReverse ? 'reverse' : 'forward',
    field.propertyIri ?? field.path
  );
}
