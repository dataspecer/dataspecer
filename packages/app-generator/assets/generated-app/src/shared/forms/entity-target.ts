import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  FieldDescriptor,
  SpecializationDescriptor,
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
  specializations?: SpecializationDescriptor[];
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

/** Returns whether a composition owns its target, including targets with no editable fields. */
export function isInlineCompositionField(
  field: FieldDescriptor
): field is FieldDescriptor & { targetClassIri: string; fields: FieldDescriptor[] } {
  return Boolean(
    isCompositionField(field) &&
    !field.targetAggregateIri &&
    field.targetClassIri &&
    field.fields !== undefined
  );
}

/** Returns whether a specialization selector or nested composition needs a separate form pane. */
export function opensInOwnPane(target: EntityTarget): boolean {
  return Boolean(target.specializations?.length || target.fields.some(isCompositionField));
}

export function resolveCompositionTarget(
  owner: EntityTarget,
  field: FieldDescriptor,
  aggregateRegistry: AggregateDescriptorMap
): EntityTarget | null {
  if (!isCompositionField(field)) {
    return null;
  }

  return resolveAssociationTarget(owner, field, aggregateRegistry);
}

function resolveAssociationTarget(
  owner: EntityTarget,
  field: FieldDescriptor,
  aggregateRegistry: AggregateDescriptorMap
): EntityTarget | null {
  if (field.kind !== 'association') {
    return null;
  }

  if (field.targetAggregateIri) {
    const target = aggregateRegistry[field.targetAggregateIri];
    return target ? rootEntityTarget(target) : null;
  }

  if (!isInlineCompositionField(field)) {
    return null;
  }

  return {
    aggregate: owner.aggregate,
    fieldPath: [...owner.fieldPath, field.path],
    name: field.label,
    classIri: field.targetClassIri,
    fields: field.fields,
    ...(field.specializations ? { specializations: field.specializations } : {}),
  };
}

export function referenceDisplayFields(
  field: FieldDescriptor,
  aggregateRegistry: AggregateDescriptorMap
): FieldDescriptor[] {
  const exposedFields = primitiveFields(field.fields);
  if (exposedFields.length > 0) {
    return exposedFields;
  }

  const targetAggregate = field.targetAggregateIri
    ? aggregateRegistry[field.targetAggregateIri]
    : undefined;
  if (targetAggregate) {
    const targetFields = primitiveFields(targetAggregate.fields);
    if (targetFields.length > 0) {
      return targetFields;
    }
  }

  const fallbackAggregate = Object.values(aggregateRegistry).find(
    (aggregate) => aggregate.classIri === field.targetClassIri
  );
  const fallbackFields = primitiveFields(fallbackAggregate?.fields);
  for (const name of ['name', 'title', 'label']) {
    const fallback = fallbackFields.find(
      (candidate) =>
        candidate.path.toLocaleLowerCase() === name ||
        candidate.propertyName.toLocaleLowerCase() === name
    );
    if (fallback) {
      return [fallback];
    }
  }
  return [];
}

function primitiveFields(fields: readonly FieldDescriptor[] | undefined): FieldDescriptor[] {
  const propertyIris = new Set<string>();
  return (fields ?? []).filter((field) => {
    if (field.kind !== 'primitive' || !field.propertyIri || propertyIris.has(field.propertyIri)) {
      return false;
    }
    propertyIris.add(field.propertyIri);
    return true;
  });
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
      ? ''
      : `Requires at least ${minimum} ${minimum === 1 ? 'value' : 'values'}`;
  }
  if (minimum === maximum) {
    return `Requires exactly ${minimum} ${minimum === 1 ? 'value' : 'values'}`;
  }
  if (minimum === 0) {
    return `Allows up to ${maximum} ${maximum === 1 ? 'value' : 'values'}`;
  }
  return `Requires ${minimum}–${maximum} values`;
}
