import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  FieldDescriptor,
} from '../types/aggregate.ts';

/**
 * Identifies one entity shape inside an aggregate schema. Inline composition targets keep the
 * owning aggregate and extend its field path. Compositions that point to another aggregate start
 * at that aggregate's root.
 */
export interface EntityTarget {
  aggregate: AggregateDescriptor;
  fieldPath: string[];
  name: string;
  classIri: string;
  fields: FieldDescriptor[];
}

export function rootEntityTarget(aggregate: AggregateDescriptor): EntityTarget {
  return {
    aggregate,
    fieldPath: [],
    name: aggregate.name,
    classIri: aggregate.classIri,
    fields: aggregate.fields,
  };
}

export function isCompositionField(field: FieldDescriptor): boolean {
  return field.kind === 'association' && field.associationKind === 'composition';
}

export function resolveCompositionTarget(
  owner: EntityTarget,
  field: FieldDescriptor,
  aggregates: AggregateDescriptorMap
): EntityTarget | null {
  if (!isCompositionField(field)) {
    return null;
  }

  if (field.targetAggregateIri) {
    const target = aggregates[field.targetAggregateIri];
    return target ? rootEntityTarget(target) : null;
  }

  if (!field.targetClassIri || !field.fields) {
    return null;
  }

  return {
    aggregate: owner.aggregate,
    fieldPath: [...owner.fieldPath, field.path],
    name: field.label,
    classIri: field.targetClassIri,
    fields: field.fields,
  };
}

export function minimumCount(field: FieldDescriptor): number {
  return field.minCount ?? (field.required ? 1 : 0);
}

export function maximumCount(field: FieldDescriptor): number | null {
  return field.maxCount === undefined ? (field.many ? null : 1) : field.maxCount;
}

export function cardinalityDescription(field: FieldDescriptor): string {
  const minimum = minimumCount(field);
  const maximum = maximumCount(field);
  if (maximum === null) {
    return minimum === 0
      ? 'Any number of values'
      : `At least ${minimum} ${minimum === 1 ? 'value' : 'values'}`;
  }
  if (minimum === maximum) {
    return `Exactly ${minimum} ${minimum === 1 ? 'value' : 'values'}`;
  }
  if (minimum === 0) {
    return `Up to ${maximum} ${maximum === 1 ? 'value' : 'values'}`;
  }
  return `${minimum}–${maximum} values`;
}
