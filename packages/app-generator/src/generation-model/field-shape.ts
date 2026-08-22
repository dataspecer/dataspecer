import { AssociationKind } from '../graph/types.ts';
import { FieldKind } from '../metadata/types.ts';

interface NestedModelFieldShape {
  kind: FieldKind;
  associationKind?: AssociationKind;
  targetAggregateIri?: string;
  targetClassIri?: string;
  fields?: readonly unknown[];
}

/** Returns true when a field produces an inline entity model rather than an IRI reference. */
export function hasNestedModel(field: NestedModelFieldShape): boolean {
  return Boolean(
    field.kind === FieldKind.Association &&
    field.associationKind === AssociationKind.Composition &&
    !field.targetAggregateIri &&
    field.fields?.length &&
    field.targetClassIri
  );
}
